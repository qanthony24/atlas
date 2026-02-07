
import { IDataClient } from '../data/client';

/**
 * SMOKE TEST
 * 
 * Verifies the Critical User Journey:
 * 1. Identify User/Org
 * 2. Create a List
 * 3. Assign the List
 * 4. Record an Interaction
 * 
 * Usage: Call runSmokeTest(client) from the browser console or a test runner.
 */
export async function runSmokeTest(client: IDataClient) {
    console.group("🔥 Starting Smoke Test");
    const results: Record<string, string> = {};

    try {
        // 1. Identity
        console.log("Step 1: Check Identity...");
        const user = await client.getCurrentUser();
        const org = await client.getCurrentOrg();
        if (!user || !org) throw new Error("Identity check failed");
        results['Identity'] = '✅ Passed';
        console.log(`User: ${user.name}, Org: ${org.name}`);

        // 2. Data Fetch
        console.log("Step 2: Fetch Voters...");
        const voters = await client.getVoters({ limit: 1 });
        if (voters.length === 0) console.warn("Warning: No voters found for test");
        results['FetchVoters'] = '✅ Passed';

        // 3. Create List
        console.log("Step 3: Create Walk List...");
        const voterIds = voters.slice(0, 2).map(v => v.id);
        const listName = `Smoke Test List ${Date.now()}`;
        const list = await client.createWalkList(listName, voterIds);
        if (list.name !== listName) throw new Error("List creation mismatch");
        results['CreateList'] = '✅ Passed';

        // 4. Assignments
        console.log("Step 4: Assign List...");
        const assignment = await client.assignList(list.id, user.id);
        if (assignment.listId !== list.id) throw new Error("Assignment mismatch");
        results['AssignList'] = '✅ Passed';

        // 5. Interaction
        if (voterIds.length > 0) {
            console.log("Step 5: Log Interaction...");
            const interaction = await client.logInteraction({
                client_interaction_uuid: crypto.randomUUID(),
                org_id: org.id,
                voter_id: voterIds[0],
                assignment_id: assignment.id,
                occurred_at: new Date().toISOString(),
                channel: 'canvass',
                result_code: 'contacted',
                notes: 'Smoke test interaction'
            });
            if (interaction.result_code !== 'contacted') throw new Error("Interaction mismatch");
            results['LogInteraction'] = '✅ Passed';
        } else {
             results['LogInteraction'] = '⚠️ Skipped (No Voters)';
        }

        console.log("Smoke Test Completed Successfully");
    } catch (e: any) {
        console.error("❌ Smoke Test Failed:", e);
        results['Overall'] = `❌ Failed: ${e.message}`;
    } finally {
        console.table(results);
        console.groupEnd();
    }
}
