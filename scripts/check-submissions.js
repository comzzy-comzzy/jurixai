import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Fetching registrations...");
  const { data: regs, error: regsErr } = await supabase
    .from("registrations")
    .select("id, hackathon_id, project_name, team_name, github_url, demo_url, status, created_at");
  
  if (regsErr) {
    console.error("Error registrations:", regsErr);
    return;
  }
  
  console.log("Total registrations:", regs.length);
  for (const reg of regs) {
    console.log(`- Project: "${reg.project_name}" (${reg.team_name})`);
    console.log(`  Hackathon: ${reg.hackathon_id}`);
    console.log(`  GitHub: ${reg.github_url}`);
    console.log(`  Status: ${reg.status}`);
    console.log(`  Created: ${reg.created_at}`);
    console.log("---");
  }
}

check();
