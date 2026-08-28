// 전체 구독자에게 공지 푸시. 사용: npm run notify -- "제목" "본문" [/url]
import { sendPushToAll } from "../src/lib/push";
const [title, body, url] = process.argv.slice(2);
if (!title || !body) { console.error('사용: npm run notify -- "제목" "본문" [/url]'); process.exit(1); }
sendPushToAll({ title, body, url: url ?? "/", tag: "notice" }).then((r) => { console.log("공지 발송:", r); process.exit(0); });
