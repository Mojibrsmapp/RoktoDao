// --- Page Navigation ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(s => s.classList.remove('active'));
    document.getElementById(pageId).classList.add('active');
}

// --- Dynamic Location Load ---
document.addEventListener('DOMContentLoaded', () => {
    const divSelect = document.getElementById('regDivision');
    const searchDiv = document.getElementById('searchDivision');
    
    // divisions_bn গ্লোবাল ভেরিয়েবল হিসেবে সরাসরি অ্যাক্সেসযোগ্য
    if (typeof divisions_bn !== 'undefined') {
        divisions_bn.forEach(div => {
            divSelect.add(new Option(div.title, div.value));
            searchDiv.add(new Option(div.title, div.value));
        });
    }
});

function loadDistricts(prefix) {
    const divValue = document.getElementById(`${prefix}Division`).value;
    const distSelect = document.getElementById(`${prefix}District`);
    distSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
    
    if (divValue && typeof districts_bn !== 'undefined' && districts_bn[divValue]) {
        distSelect.disabled = false;
        districts_bn[divValue].forEach(dist => {
            distSelect.add(new Option(dist.title, dist.title));
        });
    } else {
        distSelect.disabled = true;
    }
}

// --- Search Function (Turso) ---
async function fetchDonors() {
    const blood = document.getElementById('searchBloodGroup').value;
    const district = document.getElementById('searchDistrict').value;
    const donorList = document.getElementById('donorList');
    
    donorList.innerHTML = '<p>খুঁজছি...</p>';
    
    const TURSO_URL = "https://rokto-rokto.aws-ap-northeast-1.turso.io/v2/pipeline";
    const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI3MTE2OTksImlkIjoiMDE5ZDNiNTktMjMwMS03MmYxLTg5MzQtNGVjMzg1ZjY3ZTQ0IiwicmlkIjoiZjk3OTZhNjctYzI5Ni00YTQ4LWIxNzYtYzAwYWI2ODg2ZmJiIn0.FrG-Keodd1Kl2PfxEGsY30xndaZiwngmxVMShQ800LSs8n7mf6QWKYdGH97PGHz8FKJn9uU-chqM_LIYy5MUAQ";

    let sql = "SELECT * FROM donors WHERE 1=1";
    let args = [];
    if (blood) { sql += " AND bloodType = ?"; args.push({type: "text", value: blood}); }
    if (district) { sql += " AND district = ?"; args.push({type: "text", value: district}); }

    const response = await fetch(TURSO_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requests: [{ type: "execute", stmt: { sql: sql, args: args } }, { type: "close" }] })
    });
    
    const data = await response.json();
    // এখানে ডেটা রেন্ডারিং লজিক বসবে
    console.log(data);
}
