"""
Mock Database Service for SAFAPAC
Uses JSON files for persistence during development
Will be replaced with SQLite/PostgreSQL in production
"""

import json
import os
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path
import uuid


class MockDatabase:
    """Simple JSON-based database for projects and scenarios"""

    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)

        self.users_file = self.data_dir / "users.json"
        self.projects_file = self.data_dir / "projects.json"
        self.scenarios_file = self.data_dir / "scenarios.json"

        # Initialize files if they don't exist
        self._init_files()

    def _init_files(self):
        """Initialize JSON files with empty structures"""
        if not self.users_file.exists():
            self._save_json(self.users_file, {
                "safapac": {
                    "user_id": "user_001",
                    "username": "safapac",
                    "password": "landingpage2025",  # In production, this would be hashed
                    "email": "safapac@example.com",
                    "created_at": datetime.now().isoformat()
                }
            })

        if not self.projects_file.exists():
            self._save_json(self.projects_file, {})

        if not self.scenarios_file.exists():
            self._save_json(self.scenarios_file, {})

    def _load_json(self, file_path: Path) -> dict:
        """Load JSON file"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def _save_json(self, file_path: Path, data: dict):
        """Save JSON file"""
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

    # ==================== USER OPERATIONS ====================

    def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Get user by username"""
        users = self._load_json(self.users_file)
        return users.get(username)

    def get_user_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by user_id"""
        users = self._load_json(self.users_file)
        for user in users.values():
            if user.get("user_id") == user_id:
                return user
        return None

    # ==================== PROJECT OPERATIONS ====================

    def create_project(self, user_id: str, project_name: str) -> Dict:
        """Create a new project"""
        projects = self._load_json(self.projects_file)

        project_id = f"proj_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.now().isoformat()

        project = {
            "project_id": project_id,
            "user_id": user_id,
            "project_name": project_name,
            "created_at": timestamp,
            "updated_at": timestamp,
            "scenario_count": 0
        }

        projects[project_id] = project
        self._save_json(self.projects_file, projects)

        return project

    def get_project(self, project_id: str) -> Optional[Dict]:
        """Get project by ID"""
        projects = self._load_json(self.projects_file)
        return projects.get(project_id)

    def list_projects_by_user(self, user_id: str) -> List[Dict]:
        """List all projects for a user"""
        projects = self._load_json(self.projects_file)
        user_projects = [
            p for p in projects.values()
            if p.get("user_id") == user_id
        ]
        # Sort by updated_at descending
        user_projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
        return user_projects

    def update_project(self, project_id: str, updates: Dict) -> Optional[Dict]:
        """Update project fields"""
        projects = self._load_json(self.projects_file)

        if project_id not in projects:
            return None

        project = projects[project_id]
        project.update(updates)
        project["updated_at"] = datetime.now().isoformat()

        self._save_json(self.projects_file, projects)
        return project

    def delete_project(self, project_id: str) -> bool:
        """Delete a project and all its scenarios"""
        projects = self._load_json(self.projects_file)
        scenarios = self._load_json(self.scenarios_file)

        if project_id not in projects:
            return False

        # Delete all scenarios in this project
        scenarios_to_delete = [
            sid for sid, s in scenarios.items()
            if s.get("project_id") == project_id
        ]
        for sid in scenarios_to_delete:
            del scenarios[sid]

        # Delete project
        del projects[project_id]

        self._save_json(self.projects_file, projects)
        self._save_json(self.scenarios_file, scenarios)

        return True

    # ==================== SCENARIO OPERATIONS ====================

    def create_scenario(self, project_id: str, scenario_name: str, order: int,
                       inputs: Optional[Dict] = None, outputs: Optional[Dict] = None) -> Dict:
        """Create a new scenario"""
        scenarios = self._load_json(self.scenarios_file)
        projects = self._load_json(self.projects_file)

        scenario_id = f"scen_{uuid.uuid4().hex[:12]}"
        timestamp = datetime.now().isoformat()

        scenario = {
            "scenario_id": scenario_id,
            "project_id": project_id,
            "scenario_name": scenario_name,
            "order": order,
            "inputs": inputs or {},
            "outputs": outputs or {},
            "created_at": timestamp,
            "updated_at": timestamp
        }

        scenarios[scenario_id] = scenario
        self._save_json(self.scenarios_file, scenarios)

        # Update project scenario count
        if project_id in projects:
            projects[project_id]["scenario_count"] = self.count_scenarios_by_project(project_id)
            projects[project_id]["updated_at"] = timestamp
            self._save_json(self.projects_file, projects)

        return scenario

    def get_scenario(self, scenario_id: str) -> Optional[Dict]:
        """Get scenario by ID"""
        scenarios = self._load_json(self.scenarios_file)
        return scenarios.get(scenario_id)

    def list_scenarios_by_project(self, project_id: str) -> List[Dict]:
        """List all scenarios for a project"""
        scenarios = self._load_json(self.scenarios_file)
        project_scenarios = [
            s for s in scenarios.values()
            if s.get("project_id") == project_id
        ]
        # Sort by order
        project_scenarios.sort(key=lambda x: x.get("order", 999))
        return project_scenarios

    def count_scenarios_by_project(self, project_id: str) -> int:
        """Count scenarios in a project"""
        return len(self.list_scenarios_by_project(project_id))

    def update_scenario(self, scenario_id: str, updates: Dict) -> Optional[Dict]:
        """Update scenario fields"""
        scenarios = self._load_json(self.scenarios_file)
        projects = self._load_json(self.projects_file)

        if scenario_id not in scenarios:
            return None

        scenario = scenarios[scenario_id]

        # Handle nested updates for inputs and outputs
        if "inputs" in updates:
            scenario["inputs"].update(updates["inputs"])
            del updates["inputs"]

        if "outputs" in updates:
            scenario["outputs"].update(updates["outputs"])
            del updates["outputs"]

        # Apply other updates
        scenario.update(updates)
        scenario["updated_at"] = datetime.now().isoformat()

        self._save_json(self.scenarios_file, scenarios)

        # Update project timestamp
        project_id = scenario.get("project_id")
        if project_id and project_id in projects:
            projects[project_id]["updated_at"] = datetime.now().isoformat()
            self._save_json(self.projects_file, projects)

        return scenario

    def delete_scenario(self, scenario_id: str) -> bool:
        """Delete a scenario"""
        scenarios = self._load_json(self.scenarios_file)
        projects = self._load_json(self.projects_file)

        if scenario_id not in scenarios:
            return False

        project_id = scenarios[scenario_id].get("project_id")
        del scenarios[scenario_id]

        self._save_json(self.scenarios_file, scenarios)

        # Update project scenario count
        if project_id and project_id in projects:
            projects[project_id]["scenario_count"] = self.count_scenarios_by_project(project_id)
            projects[project_id]["updated_at"] = datetime.now().isoformat()
            self._save_json(self.projects_file, projects)

        return True


# Global database instance
db = MockDatabase()
