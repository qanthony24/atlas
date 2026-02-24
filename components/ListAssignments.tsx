import React, { useContext } from 'react';
import { AppContext } from './AppContext';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';
import { Table } from '../src/design/components/Table';

const ListAssignments: React.FC = () => {
  const context = useContext(AppContext);
  const [error, setError] = React.useState<string | null>(null);

  if (!context) return null;
  const { walkLists, canvassers, assignments, client, refreshData } = context;

  const handleAssign = async (listId: string, canvasserId: string) => {
    setError(null);
    if (!canvasserId) return;
    try {
      await client.assignList(listId, canvasserId);
      await refreshData();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'Failed to assign list');
    }
  };

  const getAssignedCanvasserId = (listId: string) => {
    const assignment = assignments.find((a) => a.listId === listId);
    return assignment ? assignment.canvasserId : '';
  };

  return (
    <div>
      <PageHeader title="List Assignments" />

      {error ? (
        <div className="atlas-error" style={{ marginBottom: 12 }}>
          {error}
        </div>
      ) : null}

      <div style={{ overflowX: 'auto' }}>
        <Table>
            <thead>
              <tr>
                <th>Walk List</th>
                <th>Voters</th>
                <th>Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {walkLists.map((list) => (
                <tr key={list.id}>
                  <td>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{list.name}</div>
                  </td>
                  <td className="atlas-mono">{list.voterIds.length}</td>
                  <td>
                    <select
                      value={getAssignedCanvasserId(list.id)}
                      onChange={(e) => handleAssign(list.id, e.target.value)}
                      className="atlas-input"
                      style={{ maxWidth: 320 }}
                    >
                      <option value="">Unassigned</option>
                      {canvassers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
      </div>
    </div>
  );
};

export default ListAssignments;
