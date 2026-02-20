
import React, { useContext } from 'react';
import { AppContext } from './AppContext';

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
            setError(e?.message || "Failed to assign list");
        }
    };

    const getAssignedCanvasserId = (listId: string) => {
        const assignment = assignments.find(a => a.listId === listId);
        return assignment ? assignment.canvasserId : '';
    };

    return (
        <div>
            <h1 className="text-3xl font-semibold text-gray-800">List Assignments</h1>
            <p className="mt-2 text-gray-600">Assign walk lists to your canvassers.</p>

            {error && (
                <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3">
                    {error}
                </div>
            )}
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Walk List</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Voters</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {walkLists.map(list => (
                                <tr key={list.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{list.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{list.voterIds.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <select 
                                            value={getAssignedCanvasserId(list.id)}
                                            onChange={(e) => handleAssign(list.id, e.target.value)}
                                            className="p-2 border border-gray-300 rounded-md"
                                        >
                                            <option value="">Unassigned</option>
                                            {canvassers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ListAssignments;
