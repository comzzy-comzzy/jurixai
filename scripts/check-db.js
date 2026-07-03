import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking Supabase tables...");

  // 1. Check judge_agents
  const { data: agents, error: agentsErr } = await supabase
    .from("judge_agents")
    .select("slug, name, wallet_address");
  if (agentsErr) console.error("Error fetching agents:", agentsErr);
  else console.log("Judge Agents:", agents);

  // 2. Check judging runs
  const { data: runs, error: runsErr } = await supabase
    .from("judging_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);
  if (runsErr) console.error("Error fetching runs:", runsErr);
  else console.log("Recent Judging Runs:", runs);

  // 3. Check judging run items
  const { data: runItems, error: itemsErr } = await supabase
    .from("judging_run_items")
    .select("status, error_message, count")
    .select("status, error_message, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (itemsErr) console.error("Error fetching run items:", itemsErr);
  else console.log("Recent Run Items:", runItems);

  // 4. Check payments
  const { data: payments, error: payErr } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);
  if (payErr) console.error("Error fetching payments:", payErr);
  else console.log("Recent Payments:", payments);
}

check();
