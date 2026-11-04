import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

SPEC = importlib.util.spec_from_file_location(
    "mobile_update", Path(__file__).with_name("mobile-update-needed.py")
)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class MobileUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.original_git = MODULE.git
        MODULE.git = lambda *args: subprocess.check_output(
            ["git", "-C", str(self.root), *args], stderr=subprocess.DEVNULL
        )
        self.addCleanup(setattr, MODULE, "git", self.original_git)
        MODULE.git("init", "-q")
        self.write("apps/mobile/package.json", {"dependencies": {"react": "19"}, "jest": {}})
        self.before = self.commit()

    def write(self, path, value):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value))

    def commit(self):
        MODULE.git("add", ".")
        MODULE.git("-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-qm", "test")
        return MODULE.git("rev-parse", "HEAD").decode().strip()

    def test_jest_only_and_infrastructure_skip(self):
        self.write("apps/mobile/package.json", {"jest": {"watchman": False}, "dependencies": {"react": "19"}})
        self.write(".github/workflows/deploy-mobile.yml", "changed guard")
        self.write("packages/database/docker-compose.yml", "local infrastructure")
        self.assertFalse(MODULE.update_needed(self.before, self.commit()))

    def test_dependency_change_publishes_even_with_jest_change(self):
        self.write("apps/mobile/package.json", {"dependencies": {"react": "20"}, "jest": {"watchman": False}})
        self.assertTrue(MODULE.update_needed(self.before, self.commit()))

    def test_runtime_inputs_publish(self):
        for path in ("apps/mobile/src/app.tsx", "packages/shared/index.ts", "pnpm-lock.yaml"):
            with self.subTest(path=path):
                before = MODULE.git("rev-parse", "HEAD").decode().strip()
                self.write(path, "changed")
                self.assertTrue(MODULE.update_needed(before, self.commit()))

    def test_missing_history_publishes(self):
        self.assertTrue(MODULE.update_needed("0" * 40, self.before))

    def test_removed_manifest_publishes(self):
        (self.root / "apps/mobile/package.json").unlink()
        self.assertTrue(MODULE.update_needed(self.before, self.commit()))

    def test_invalid_manifest_publishes(self):
        (self.root / "apps/mobile/package.json").write_text("invalid")
        self.assertTrue(MODULE.update_needed(self.before, self.commit()))
