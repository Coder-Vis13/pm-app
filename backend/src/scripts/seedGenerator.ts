/**
 * generateSeeds.ts
 *
 * Generates SQL for tasks 11-20 plus task_assignees, task_history,
 * workflow_event. Edit templates as needed.
 */
import { writeFileSync } from "fs";

const PROJECT="99999999-9999-9999-9999-999999999999";
const BACKLOG="aaaaaaaa-1111-1111-1111-111111111111";
const DEV="bbbbbbbb-2222-2222-2222-222222222222";
const USERS=[
"11111111-1111-1111-1111-111111111111",
"22222222-2222-2222-2222-222222222222",
"33333333-3333-3333-3333-333333333333",
"44444444-4444-4444-4444-444444444444",
"55555555-5555-5555-5555-555555555555",
];
const titles=[
"Email service","Search API","Audit logs","Export reports","Team invites",
"Mobile layout","Analytics","Caching","Admin panel","Accessibility"
];
const patterns=[
["to_do","in_progress","done"],
["to_do","in_progress","waiting","in_progress","done"],
["to_do","in_progress","blocked","in_progress","done"],
["to_do","waiting","in_progress"],
["to_do","in_progress","waiting","in_progress","blocked"],
];
let sql="BEGIN;\n\n";
for(let i=11;i<=20;i++){
 const hex=i.toString().padStart(12,"0");
 const task=`10000000-0000-0000-0000-${hex}`;
 const user=USERS[(i-11)%USERS.length];
 const sec=i<16?BACKLOG:DEV;
 const pat=patterns[(i-11)%patterns.length];
 const finalStatus=pat[pat.length-1];
 sql+=`INSERT INTO task(id,title,description,project_id,section_id,delay_cause_id,parent_task_id,priority,risk_score,start_date,due_date,position,created_by,created_at,updated_at,deleted_at,is_deleted,status)
VALUES('${task}','${titles[i-11]}','Generated task','${PROJECT}','${sec}',NULL,NULL,'medium',${(i%9)+1},'2026-07-${String(i).padStart(2,"0")}','2026-08-${String(i).padStart(2,"0")}',${i},'${user}','2026-07-${String(i).padStart(2,"0")} 09:00+00','2026-07-${String(i).padStart(2,"0")} 09:00+00',NULL,false,'${finalStatus}');
`;
 sql+=`INSERT INTO task_assignees(id,task_id,user_id) VALUES(gen_random_uuid(),'${task}','${user}');
`;
 let day=i;
 for(let j=0;j<pat.length;j++){
   const st=pat[j];
   const evt=j==0?"created":"updated";
   const ts=`2026-07-${String(day).padStart(2,"0")} 09:00+00`;
   sql+=`INSERT INTO task_history(id,task_id,task_snapshot,user_id,event_type,created_at) VALUES(gen_random_uuid(),'${task}','{"status":"${st}"}','${user}','${evt}','${ts}');
`;
   if(j>0){
    sql+=`INSERT INTO workflow_event(id,task_id,project_id,user_id,event_type,from_value,to_value,created_at) VALUES(gen_random_uuid(),'${task}','${PROJECT}','${user}','status_changed','${pat[j-1]}','${st}','${ts}');
`;
   }
   day+=2;
 }
 sql+=`INSERT INTO workflow_event(id,task_id,project_id,user_id,event_type,from_value,to_value,created_at) VALUES(gen_random_uuid(),'${task}','${PROJECT}','${user}','assignee_added',NULL,'${user}','2026-07-${String(i).padStart(2,"0")} 09:01+00');

`;
}
sql+="COMMIT;\n";
writeFileSync("generated_seed_tasks_11_20.sql",sql);
console.log("Done");
