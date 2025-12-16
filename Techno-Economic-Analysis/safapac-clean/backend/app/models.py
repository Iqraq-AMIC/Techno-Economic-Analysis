from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union


# -----------------------------------------------------------------------------
# Utility helpers
# -----------------------------------------------------------------------------


def _normalize_unit(unit: Optional[str]) -> str:
    if not unit:
        return ""
    return (
        unit.lower()
        .replace(" ", "")
        .replace("_", "")
        .replace("-", "")
    )


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def _to_quantity(data: Union["Quantity", Dict[str, Any], None]) -> Optional["Quantity"]:
    if data is None:
        return None
    if isinstance(data, Quantity):
        return data
    if isinstance(data, dict):
        return Quantity(value=data["value"], unit=data["unit"])
    raise TypeError(f"Unsupported quantity type: {type(data)!r}")


# -----------------------------------------------------------------------------
# Core input dataclasses
# -----------------------------------------------------------------------------


@dataclass
class Quantity:
    value: float
    unit: str

    def normalized_unit(self) -> str:
        return _normalize_unit(self.unit)


# 1.1 Conversion Plant --------------------------------------------------------
@dataclass
class ConversionPlant:
    total_liquid_fuel_capacity: Quantity  # value + unit (e.g., KTA, MGPY, BPD)
    annual_load_hours: float              # hours/year
    conversion_process_carbon_intensity_default: float  # gCO2e/MJ
    process_type: Optional[str] = None    # optional process key to match refs
    average_liquid_density: Optional[Quantity] = None   # kg/m3 (required for volume units)


# 1.2 Feedstock & Utilities Data ----------------------------------------------
@dataclass
class Feedstock:
    name: str
    price: Quantity                       # e.g., USD/t
    carbon_content: float                 # fraction (0-1)
    carbon_intensity: Quantity            # e.g., gCO2e/kg
    energy_content: Quantity              # e.g., MJ/kg
    yield_: Quantity                      # e.g., kg/kg fuel


@dataclass
class Utility:
    name: str
    price: Quantity                       # e.g., USD/kg (hydrogen), USD/kWh (electricity)
    carbon_intensity: Optional[Quantity] = None  # optional, e.g., gCO2e/kWh
    energy_content: Optional[Quantity] = None    # optional
    yield_: Optional[Quantity] = None            # optional, e.g., kg/kg or kWh/kg


# 1.4 Product Data ------------------------------------------------------------
@dataclass
class Product:
    name: str
    price: Quantity                       # e.g., USD/t
    price_sensitivity_to_ci: Quantity     # e.g., USD per gCO2e/MJ
    carbon_content: float                 # fraction (0-1)
    energy_content: Quantity              # e.g., MJ/kg
    yield_: Quantity                      # e.g., kg/kg fuel
    mass_fraction: float                  # percentage (0-100)


# 1.5 Economic Parameters -----------------------------------------------------
@dataclass
class EconomicParameters:
    discount_rate: float                  # decimal, e.g., 0.07
    project_lifetime_years: int
    tci_at_reference_capacity: Quantity   # currency
    tci_scaling_exponent: float           # e.g., 0.6
    reference_production_capacity: Quantity  # same basis as plant capacity
    wc_to_tci_ratio: float
    indirect_opex_to_tci_ratio: float


# -----------------------------------------------------------------------------
# Structured user inputs + conversion helpers
# -----------------------------------------------------------------------------


@dataclass
class UserInputs:
    """
    Structured inputs that include value + unit metadata. The `to_flat_dict`
    helper converts them into the scalar format expected by the legacy
    techno-economic layers while we migrate feature logic.
    """

    plant: ConversionPlant
    feedstocks: List[Feedstock] = field(default_factory=list)
    utilities: List[Utility] = field(default_factory=list)
    products: List[Product] = field(default_factory=list)
    economics: Optional[EconomicParameters] = None

    # Optional / legacy fields for compatibility
    CEPCI: float = 800.0
    legacy_biomass_price: Optional[float] = None

    # ------------------------------------------------------------------
    # Conversion helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _density_to_kg_per_m3(density: Optional[Quantity]) -> Optional[float]:
        if density is None:
            return None
        unit = density.normalized_unit()
        value = density.value

        if unit in {"kg/m3", "kgperm3", "kgper/m3"}:
            return value
        if unit in {"g/cm3", "gpercm3", "g/cm^3", "gpercm^3"}:
            return value * 1000.0

        raise ValueError(f"Unsupported density unit '{density.unit}'")

    @classmethod
    def _capacity_to_tpy(
        cls,
        capacity: Quantity,
        annual_load_hours: float,
        average_density: Optional[Quantity],
    ) -> float:
        unit = capacity.normalized_unit()
        value = capacity.value

        if unit in {"t/yr", "ton/yr", "tons/yr", "tpa", "tpy"}:
            return value
        if unit in {"kta", "kt/yr", "ktpa"}:
            return value * 1000.0

        density_kg_per_m3 = cls._density_to_kg_per_m3(average_density)

        if unit in {"mgpy", "milliongallonsperyear"}:
            _require(
                density_kg_per_m3 is not None,
                "Average liquid density (kg/m3) is required when capacity is provided in MGPY.",
            )
            m3_per_mg = 3785.4118  # cubic metres per million gallons
            kg_per_year = value * m3_per_mg * density_kg_per_m3
            return kg_per_year / 1000.0

        if unit in {"bpd", "barrelsperday"}:
            _require(
                density_kg_per_m3 is not None,
                "Average liquid density (kg/m3) is required when capacity is provided in BPD.",
            )
            m3_per_barrel = 0.1589872949
            hours_factor = annual_load_hours / 24.0
            kg_per_year = value * m3_per_barrel * density_kg_per_m3 * hours_factor
            return kg_per_year / 1000.0

        raise ValueError(f"Unsupported plant capacity unit '{capacity.unit}'")

    @staticmethod
    def _price_to_usd_per_ton(price: Quantity) -> float:
        unit = price.normalized_unit()
        value = price.value

        if unit in {"usd/t", "usd/ton", "usd/tonne", "$/t", "$/ton"}:
            return value
        if unit in {"usd/kg", "$/kg"}:
            return value * 1000.0
        if unit in {"usd/kt", "$/kt"}:
            return value / 1000.0

        raise ValueError(f"Unsupported price unit '{price.unit}' for USD/ton conversion")

    @staticmethod
    def _price_to_usd_per_kg(price: Quantity) -> float:
        unit = price.normalized_unit()
        value = price.value

        if unit in {"usd/kg", "$/kg"}:
            return value
        if unit in {"usd/t", "usd/ton", "$/t", "$/ton"}:
            return value / 1000.0

        raise ValueError(f"Unsupported price unit '{price.unit}' for USD/kg conversion")

    @staticmethod
    def _price_to_usd_per_kwh(price: Quantity) -> float:
        unit = price.normalized_unit()
        value = price.value

        if unit in {"usd/kwh", "$/kwh"}:
            return value
        if unit in {"usd/mwh", "$/mwh"}:
            return value / 1000.0

        raise ValueError(f"Unsupported electricity price unit '{price.unit}'")

    @staticmethod
    def _carbon_intensity_to_g_per_kg(ci: Quantity) -> float:
        unit = ci.normalized_unit()
        value = ci.value

        if unit in {"gco2/kg", "gco2e/kg", "gco2perkg"}:
            return value
        if unit in {"kgco2/t", "kgco2e/t", "kgco2/tonne"}:
            # kg CO2 per metric ton -> convert to g per kg
            return value  # 1 kg / tonne == 1 g / kg (because both divide by 1000)

        raise ValueError(f"Unsupported carbon intensity unit '{ci.unit}'")

    @staticmethod
    def _energy_to_mj_per_kg(energy: Quantity) -> float:
        unit = energy.normalized_unit()
        value = energy.value

        if unit in {"mj/kg", "mjperkg"}:
            return value

        raise ValueError(f"Unsupported energy content unit '{energy.unit}'")

    @staticmethod
    def _yield_to_kg_per_kg(yield_quantity: Quantity) -> float:
        unit = yield_quantity.normalized_unit()
        value = yield_quantity.value

        if unit in {"kg/kg", "kgperkg", "t/t", "ton/ton"}:
            return value

        raise ValueError(f"Unsupported yield unit '{yield_quantity.unit}'")

    @staticmethod
    def _electricity_yield_to_kwh_per_kg(yield_quantity: Quantity) -> float:
        unit = yield_quantity.normalized_unit()
        value = yield_quantity.value

        if unit in {"kwh/kg", "kwhperkg"}:
            return value
        if unit in {"mwh/kg", "mwhperkg"}:
            return value * 1000.0

        raise ValueError(f"Unsupported electricity yield unit '{yield_quantity.unit}'")

    @staticmethod
    def _price_sens_to_usd_per_gco2(price_sens: Quantity) -> float:
        unit = price_sens.normalized_unit()
        value = price_sens.value

        if unit in {"usd/gco2", "usd/gco2e", "$/gco2"}:
            return value
        if unit in {"usd/kgco2", "$/kgco2"}:
            return value / 1000.0

        raise ValueError(f"Unsupported price sensitivity unit '{price_sens.unit}'")

    @classmethod
    def _capacity_ref_to_tpy(
        cls,
        capacity: Quantity,
        annual_load_hours: float,
        average_density: Optional[Quantity],
    ) -> float:
        return cls._capacity_to_tpy(capacity, annual_load_hours, average_density)

    @staticmethod
    def _currency_to_usd(amount: Quantity) -> float:
        unit = amount.normalized_unit()
        value = amount.value

        if unit in {"usd", "$"}:
            return value
        if unit in {"musd"}:
            return value * 1_000_000.0
        if unit in {"kusd"}:
            return value * 1_000.0

        raise ValueError(f"Unsupported currency unit '{amount.unit}'")

    @staticmethod
    def _normalize_mass_fraction(value: Optional[float]) -> float:
        if value is None:
            return 0.0
        if value > 1.0:
            return value / 100.0
        return value

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def to_flat_dict(self) -> Dict[str, Union[float, str]]:
        """
        Flatten the structured inputs into the scalar dictionary expected by the
        existing layer stack. Currently supports a single dominant feedstock and
        product stream while multi-stream handling is implemented.
        """
        _require(self.feedstocks, "At least one feedstock is required")
        _require(self.products, "At least one product is required")

        primary_feedstock = self.feedstocks[0]
        primary_product = self.products[0]

        utilities_by_name = {u.name.lower(): u for u in self.utilities}
        hydrogen = utilities_by_name.get("hydrogen")
        electricity = utilities_by_name.get("electricity")
        hydrogen_yield = (
            self._yield_to_kg_per_kg(hydrogen.yield_) if hydrogen and hydrogen.yield_ else None
        )
        electricity_yield = (
            self._electricity_yield_to_kwh_per_kg(electricity.yield_) if electricity and electricity.yield_ else None
        )

        products_flat = []
        for product in self.products:
            products_flat.append({
                "name": product.name,
                "product_price": self._price_to_usd_per_ton(product.price),
                "product_price_sensitivity_ci": self._price_sens_to_usd_per_gco2(product.price_sensitivity_to_ci),
                "product_carbon_content": product.carbon_content,
                "product_energy_content": self._energy_to_mj_per_kg(product.energy_content),
                "product_yield": self._yield_to_kg_per_kg(product.yield_),
                "mass_fraction": self._normalize_mass_fraction(product.mass_fraction),
            })

        capacity_tpy = self._capacity_to_tpy(
            self.plant.total_liquid_fuel_capacity,
            self.plant.annual_load_hours,
            self.plant.average_liquid_density,
        )

        economics_block: Dict[str, Union[float, str]] = {}
        if self.economics:
            economics_block = {
                "discount_rate": self.economics.discount_rate,
                "plant_lifetime": self.economics.project_lifetime_years,
                "tci_ref": self._currency_to_usd(self.economics.tci_at_reference_capacity),
                "capacity_ref": self._capacity_ref_to_tpy(
                    self.economics.reference_production_capacity,
                    self.plant.annual_load_hours,
                    self.plant.average_liquid_density,
                ),
                "tci_scaling_exponent": self.economics.tci_scaling_exponent,
                "wc_to_tci_ratio": self.economics.wc_to_tci_ratio,
                "indirect_opex_to_tci_ratio": self.economics.indirect_opex_to_tci_ratio,
            }

        flattened: Dict[str, Union[float, str, list]] = {
            "plant_total_liquid_fuel_capacity": capacity_tpy,
            "annual_load_hours": self.plant.annual_load_hours,
            "process_type": (self.plant.process_type or "").upper(),
            "conversion_process_ci_default": self.plant.conversion_process_carbon_intensity_default,

            # Primary feedstock
            "feedstock_name": primary_feedstock.name,
            "feedstock_price": self._price_to_usd_per_ton(primary_feedstock.price),
            "feedstock_carbon_content": primary_feedstock.carbon_content,
            "feedstock_carbon_intensity": self._carbon_intensity_to_g_per_kg(primary_feedstock.carbon_intensity),
            "feedstock_energy_content": self._energy_to_mj_per_kg(primary_feedstock.energy_content),
            "feedstock_yield": self._yield_to_kg_per_kg(primary_feedstock.yield_),

            # Primary product
            "product_key": primary_product.name,
            "product_price": self._price_to_usd_per_ton(primary_product.price),
            "product_price_sensitivity_ci": self._price_sens_to_usd_per_gco2(primary_product.price_sensitivity_to_ci),
            "product_carbon_content": primary_product.carbon_content,
            "product_energy_content": self._energy_to_mj_per_kg(primary_product.energy_content),
            "product_yield": self._yield_to_kg_per_kg(primary_product.yield_),
            "product_mass_fraction": self._normalize_mass_fraction(primary_product.mass_fraction),

            # Utilities (optional)
            "hydrogen_price": self._price_to_usd_per_kg(hydrogen.price) if hydrogen else 0.0,
            "electricity_rate": self._price_to_usd_per_kwh(electricity.price) if electricity else 0.0,
            # All products
            "products": products_flat,
        }

        flattened.update(economics_block)
        if hydrogen_yield is not None:
            flattened["hydrogen_yield"] = hydrogen_yield
        if electricity_yield is not None:
            flattened["electricity_yield"] = electricity_yield
        return flattened

    # ------------------------------------------------------------------
    # Factory helpers
    # ------------------------------------------------------------------

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "UserInputs":
        plant_data = data["plant"]
        plant = ConversionPlant(
            total_liquid_fuel_capacity=_to_quantity(plant_data["total_liquid_fuel_capacity"]),
            annual_load_hours=plant_data["annual_load_hours"],
            conversion_process_carbon_intensity_default=plant_data["conversion_process_carbon_intensity_default"],
            process_type=plant_data.get("process_type"),
            average_liquid_density=_to_quantity(plant_data.get("average_liquid_density")),
        )

        feedstocks = [
            Feedstock(
                name=fs["name"],
                price=_to_quantity(fs["price"]),
                carbon_content=fs["carbon_content"],
                carbon_intensity=_to_quantity(fs["carbon_intensity"]),
                energy_content=_to_quantity(fs["energy_content"]),
                yield_=_to_quantity(fs["yield_"]),
            )
            for fs in data.get("feedstocks", [])
        ]

        utilities = [
            Utility(
                name=ut["name"],
                price=_to_quantity(ut["price"]),
                carbon_intensity=_to_quantity(ut.get("carbon_intensity")),
                energy_content=_to_quantity(ut.get("energy_content")),
                yield_=_to_quantity(ut.get("yield_")),
            )
            for ut in data.get("utilities", [])
        ]

        products = [
            Product(
                name=prod["name"],
                price=_to_quantity(prod["price"]),
                price_sensitivity_to_ci=_to_quantity(prod["price_sensitivity_to_ci"]),
                carbon_content=prod["carbon_content"],
                energy_content=_to_quantity(prod["energy_content"]),
                yield_=_to_quantity(prod["yield_"]),
                mass_fraction=prod.get("mass_fraction", 0.0),
            )
            for prod in data.get("products", [])
        ]

        economics_data = data.get("economics")
        economics = None
        if economics_data:
            economics = EconomicParameters(
                discount_rate=economics_data["discount_rate"],
                project_lifetime_years=economics_data["project_lifetime_years"],
                tci_at_reference_capacity=_to_quantity(economics_data["tci_at_reference_capacity"]),
                tci_scaling_exponent=economics_data["tci_scaling_exponent"],
                reference_production_capacity=_to_quantity(economics_data["reference_production_capacity"]),
                wc_to_tci_ratio=economics_data["wc_to_tci_ratio"],
                indirect_opex_to_tci_ratio=economics_data["indirect_opex_to_tci_ratio"],
            )

        return cls(
            plant=plant,
            feedstocks=feedstocks,
            utilities=utilities,
            products=products,
            economics=economics,
            CEPCI=data.get("CEPCI", 800.0),
            legacy_biomass_price=data.get("legacy_biomass_price"),
        )

