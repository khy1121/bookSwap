"""한성대 수업계획서 공개 조회에서 학기별 과목·교수·주교재 카탈로그를 만든다.
로그인 불필요. 개인정보(교수 이메일/전화)는 저장하지 않는다.
사용: python crawl_hansung_textbooks.py 20262
"""
import sys, re, csv, json, time, xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests

B = "https://info.hansung.ac.kr"
TERM = sys.argv[1] if len(sys.argv) > 1 else "20262"
OUT = f"C:/startUp/data/hansung_{TERM}_textbooks.csv"
S = requests.Session(); S.headers["User-Agent"] = "startup-mind-catalog/0.1 (student project)"

def xml(gubun, data):
    r = S.post(f"{B}/jsp/haksa/siganpyo_aui_data.jsp?gubun={gubun}", data=data, timeout=30)
    return ET.fromstring(re.sub(r"<\?xml[^>]*\?>", "", r.content.decode("euc-kr", "replace")))

majors = [(i.findtext("tcd"), i.findtext("tnm")) for i in xml("jungonglist", {"syearhakgi": TERM}).iter("item")]
print(f"{len(majors)} majors", flush=True)

rows = {}
for code, name in majors:
    for row in xml("history", {"syearhakgi": TERM, "sjungong": code}).iter("row"):
        d = {c.tag: (c.text or "").strip() for c in row}
        plan = d.get("plan", "")
        if not plan or plan == "x": continue
        row = rows.setdefault(plan, {"plan": plan, "major_code": code, "major": name,
                                     "course_code": d["kwamokcode"], "course": d["kwamokname"],
                                     "prof": d["prof"], "bunban": d["bunban"], "isu": d["isugubun"],
                                     "majors": []})
        # 같은 분반이 여러 학과/트랙에 개설되면 전부 기록 (카테고리 탐색용)
        if (code, name) not in row["majors"]:
            row["majors"].append((code, name))
    time.sleep(0.2)
print(f"{len(rows)} sections with syllabus", flush=True)

def fetch(plan):
    for attempt in range(3):
        try:
            r = S.post(f"{B}/fuz/professor/lecturePlan/suupplan_main_view_data.jsp",
                       data={"type": "view", "yearhakgi": TERM, "code": plan}, timeout=30)
            d = json.loads(r.content.decode("euc-kr", "replace"))
            data = d.get("data") or [{}]
            return plan, d.get("insertYn"), data[0].get("book", ""), data[0].get("subbook", "")
        except Exception as e:
            time.sleep(1 + attempt)
    return plan, "ERR", "", ""

done = 0
with ThreadPoolExecutor(max_workers=6) as ex:
    futs = [ex.submit(fetch, p) for p in rows]
    for f in as_completed(futs):
        plan, ins, book, sub = f.result()
        rows[plan].update(insertYn=ins, book=book.strip(), subbook=sub.strip())
        done += 1
        if done % 200 == 0: print(f"{done}/{len(rows)}", flush=True)

cols = ["major_code","major","course_code","course","prof","bunban","isu","insertYn","book","subbook","plan","majors"]
with open(OUT, "w", newline="", encoding="utf-8-sig") as fp:
    w = csv.DictWriter(fp, fieldnames=cols); w.writeheader()
    for r in sorted(rows.values(), key=lambda x: (x["major_code"], x["course_code"], x["prof"])):
        r = dict(r); r["majors"] = ";".join(f"{c}|{n}" for c, n in r["majors"])  # "K170|[K170] 컴퓨터공학부;V021|..."
        w.writerow(r)
n_book = sum(1 for r in rows.values() if r.get("book") and r["book"] not in ("없음","-",""))
print(f"saved {OUT}: {len(rows)} sections, {n_book} with 주교재", flush=True)
