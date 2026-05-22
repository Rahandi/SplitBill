import json
import pytest
from unittest.mock import MagicMock, patch, call


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_table():
    """Return a GroupMembersTable whose Database is fully mocked."""
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_db.cursor.return_value = mock_cursor
    with patch('database.tables.group_members.Database') as MockDB:
        MockDB.return_value.get_db.return_value = mock_db
        from database.tables.group_members import GroupMembersTable
        table = GroupMembersTable()
    return table, mock_db, mock_cursor


def make_flask_client():
    """Return a Flask test client with DB + table calls fully mocked."""
    mock_db = MagicMock()
    mock_cursor = MagicMock()
    mock_db.cursor.return_value = mock_cursor

    with patch('mysql.connector.connect', return_value=mock_db):
        import importlib, sys
        # Remove cached modules so imports re-run with the mock in place
        for mod in list(sys.modules.keys()):
            if mod.startswith(('database', 'controllers', 'main')):
                del sys.modules[mod]
        import main as app_module
        app_module.app.config['TESTING'] = True
        client = app_module.app.test_client()
    return client, app_module, mock_db, mock_cursor


# ---------------------------------------------------------------------------
# Unit tests — GroupMembersTable
# ---------------------------------------------------------------------------

class TestGroupMembersTableGet:
    def test_returns_list_of_names(self):
        table, _, cursor = make_table()
        cursor.fetchall.return_value = [('alice',), ('bob',)]
        result = table.get_by_group_id(1)
        assert result == ['alice', 'bob']

    def test_returns_empty_list_for_new_group(self):
        table, _, cursor = make_table()
        cursor.fetchall.return_value = []
        result = table.get_by_group_id(99)
        assert result == []

    def test_queries_correct_group_id(self):
        table, _, cursor = make_table()
        cursor.fetchall.return_value = []
        table.get_by_group_id(42)
        args = cursor.execute.call_args[0]
        assert 42 in args[1]


class TestGroupMembersTableAdd:
    def test_returns_true_on_success(self):
        table, db, _ = make_table()
        result = table.add(1, 'alice')
        assert result is True

    def test_commits_on_success(self):
        table, db, _ = make_table()
        table.add(1, 'alice')
        db.commit.assert_called_once()

    def test_lowercases_name(self):
        table, _, cursor = make_table()
        table.add(1, 'Alice')
        args = cursor.execute.call_args[0]
        assert 'alice' in args[1]

    def test_returns_false_on_duplicate(self):
        table, db, cursor = make_table()
        cursor.execute.side_effect = Exception('Duplicate entry')
        result = table.add(1, 'alice')
        assert result is False

    def test_rollbacks_on_failure(self):
        table, db, cursor = make_table()
        cursor.execute.side_effect = Exception('Duplicate entry')
        table.add(1, 'alice')
        db.rollback.assert_called_once()

    def test_does_not_commit_on_failure(self):
        table, db, cursor = make_table()
        cursor.execute.side_effect = Exception('error')
        table.add(1, 'alice')
        db.commit.assert_not_called()


class TestGroupMembersTableRemove:
    def test_returns_true_when_row_deleted(self):
        table, _, cursor = make_table()
        cursor.rowcount = 1
        result = table.remove(1, 'alice')
        assert result is True

    def test_returns_false_when_not_found(self):
        table, _, cursor = make_table()
        cursor.rowcount = 0
        result = table.remove(1, 'ghost')
        assert result is False

    def test_commits_on_remove(self):
        table, db, cursor = make_table()
        cursor.rowcount = 1
        table.remove(1, 'alice')
        db.commit.assert_called_once()

    def test_lowercases_name(self):
        table, _, cursor = make_table()
        cursor.rowcount = 1
        table.remove(1, 'Alice')
        args = cursor.execute.call_args[0]
        assert 'alice' in args[1]


# ---------------------------------------------------------------------------
# Integration tests — Flask routes
# ---------------------------------------------------------------------------

class TestMemberRoutes:
    @pytest.fixture(autouse=True)
    def setup(self):
        self.mock_group = MagicMock()
        self.mock_group.id = 7
        self.mock_group.name = 'Test Group'
        self.mock_group.join_code = 'abc123'
        self.mock_group.passcode_hash = None
        self.mock_group.to_dict.return_value = {
            'id': 7, 'name': 'Test Group', 'join_code': 'abc123', 'has_passcode': False
        }

    def _client(self, members_list=None, add_ok=True):
        if members_list is None:
            members_list = []
        mock_db = MagicMock()
        mock_cursor = MagicMock()
        mock_db.cursor.return_value = mock_cursor

        ocr_stubs = {
            'pytesseract': MagicMock(),
            'PIL': MagicMock(),
            'PIL.Image': MagicMock(),
            'PIL.ImageFilter': MagicMock(),
            'PIL.ImageOps': MagicMock(),
        }
        with patch('mysql.connector.connect', return_value=mock_db), \
             patch.dict('sys.modules', ocr_stubs):
            import sys
            for mod in list(sys.modules.keys()):
                if mod.startswith(('database', 'controllers', 'main')):
                    del sys.modules[mod]
            import main as app_module

            # Patch controller and table after import
            app_module.group_controller.check_access = MagicMock(return_value=self.mock_group)
            app_module.GroupMembersTable = MagicMock()
            instance = app_module.GroupMembersTable.return_value
            instance.get_by_group_id.return_value = members_list
            instance.add.return_value = add_ok
            instance.remove.return_value = True

            app_module.app.config['TESTING'] = True
            return app_module.app.test_client(), app_module

    def test_get_members_returns_list(self):
        client, app = self._client(members_list=['alice', 'bob'])
        r = client.get('/group/abc123/members')
        assert r.status_code == 200
        data = json.loads(r.data)
        assert data['data'] == ['alice', 'bob']

    def test_get_members_empty_group(self):
        client, _ = self._client(members_list=[])
        r = client.get('/group/abc123/members')
        assert r.status_code == 200
        assert json.loads(r.data)['data'] == []

    def test_get_members_unknown_group_returns_404(self):
        client, app = self._client()
        app.group_controller.check_access = MagicMock(return_value=None)
        r = client.get('/group/nope/members')
        assert r.status_code == 404

    def test_get_members_wrong_passcode_returns_403(self):
        client, app = self._client()
        app.group_controller.check_access = MagicMock(side_effect=ValueError('Invalid passcode'))
        r = client.get('/group/abc123/members?passcode=wrong')
        assert r.status_code == 403

    def test_add_member_success(self):
        client, _ = self._client(members_list=['rahandi'], add_ok=True)
        r = client.post('/group/abc123/members',
                        data=json.dumps({'name': 'rahandi'}),
                        content_type='application/json')
        assert r.status_code == 200
        assert 'rahandi' in json.loads(r.data)['data']

    def test_add_member_empty_name_returns_400(self):
        client, _ = self._client()
        r = client.post('/group/abc123/members',
                        data=json.dumps({'name': '  '}),
                        content_type='application/json')
        assert r.status_code == 400

    def test_add_member_missing_name_returns_400(self):
        client, _ = self._client()
        r = client.post('/group/abc123/members',
                        data=json.dumps({}),
                        content_type='application/json')
        assert r.status_code == 400

    def test_add_member_duplicate_returns_409(self):
        client, _ = self._client(add_ok=False)
        r = client.post('/group/abc123/members',
                        data=json.dumps({'name': 'alice'}),
                        content_type='application/json')
        assert r.status_code == 409

    def test_remove_member_success(self):
        client, _ = self._client(members_list=['bob'])
        r = client.delete('/group/abc123/members/alice')
        assert r.status_code == 200

    def test_remove_member_unknown_group_returns_404(self):
        client, app = self._client()
        app.group_controller.check_access = MagicMock(return_value=None)
        r = client.delete('/group/nope/members/alice')
        assert r.status_code == 404

    def test_remove_member_wrong_passcode_returns_403(self):
        client, app = self._client()
        app.group_controller.check_access = MagicMock(side_effect=ValueError('Invalid passcode'))
        r = client.delete('/group/abc123/members/alice?passcode=bad')
        assert r.status_code == 403
