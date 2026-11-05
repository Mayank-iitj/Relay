import json
import os
from pathlib import Path

# Scenario: The Dragonfly Rollback
# PR says it's done, but Slack later says it was rolled back.

SCENARIO_CONTRADICTION_TEST = {
    "git_commits": [
        {
            "source_type": "GITHUB_PR",
            "external_id": "PR-1082",
            "source_url": "https://github.com/org/core-api/pull/1082",
            "author_handle": "schen",
            "timestamp": "2026-10-18T14:22:00Z",
            "content": "Refactored session caching. Replaced Redis cluster with local Dragonfly instance due to memory overhead in VPC. Verified in staging."
        }
    ],
    "slack_dump": [
        {
            "source_type": "SLACK_THREAD",
            "external_id": "MSG-9921",
            "source_url": "https://org.slack.com/archives/C021/p1697640000",
            "author_handle": "schen",
            "timestamp": "2026-10-21T09:15:00Z",
            "content": "Heads up: Dragonfly memory leak bug observed during staging load test. Rolling back to Redis until v1.2 patch lands. Do not use Dragonfly for now."
        }
    ],
    "linear_tickets": [
        {
            "source_type": "LINEAR_ISSUE",
            "external_id": "LIN-442",
            "source_url": "https://linear.app/org/issue/LIN-442",
            "author_handle": "schen",
            "timestamp": "2026-10-15T10:00:00Z",
            "content": "Investigate Dragonfly as a memory-efficient replacement for Redis in our session store."
        }
    ]
}

target_dir = Path(__file__).parent / "scenario_contradiction_test"
target_dir.mkdir(parents=True, exist_ok=True)
target_file = target_dir / "dragonfly_rollback.json"

with open(target_file, "w", encoding="utf-8") as f:
    json.dump(SCENARIO_CONTRADICTION_TEST, f, indent=2)

print(f"Generated synthetic fixture at: {target_file}")
