import pytest

from app.tools.registry import ToolValidationError, function_declarations, validate_tool_call


def test_validate_known_tool_with_valid_args():
    args = validate_tool_call("save_task", {"title": "Follow up with legal"})
    assert args.title == "Follow up with legal"
    assert args.description == ""


def test_unknown_tool_name_is_rejected_without_executing():
    with pytest.raises(ToolValidationError, match="Unknown tool"):
        validate_tool_call("delete_everything", {"target": "*"})


def test_malformed_args_are_rejected():
    with pytest.raises(ToolValidationError, match="Invalid arguments"):
        validate_tool_call("save_task", {"description": "no title provided"})


def test_missing_args_object_is_rejected_not_crashed():
    with pytest.raises(ToolValidationError):
        validate_tool_call("notify_discord", {})


def test_function_declarations_only_exposes_the_two_known_tools():
    names = {d["name"] for d in function_declarations()}
    assert names == {"save_task", "notify_discord"}
