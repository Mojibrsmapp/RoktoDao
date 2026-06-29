// --- Page Navigation Logic ---
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
}

// --- Turso Database Config ---
const TURSO_URL = "https://rokto-rokto.aws-ap-northeast-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI3MTE2OTksImlkIjoiMDE5ZDNiNTktMjMwMS03MmYxLTg5MzQtNGVjMzg1ZjY3ZTQ0IiwicmlkIjoiZjk3OTZhNjctYzI5Ni00YTQ4LWIxNzYtYzAwYWI2ODg2ZmJiIn0.FrG-Keodd1Kl2PfxEGsY30xndaZiwngmxVMShQ800LSs8n7mf6QWKYdGH97PGHz8FKJn9uU-chqM_LIYy5MUAQ";

// --- Location Loading Logic ---
// Note: Assumes `divisions_bn` and `districts_bn` variables are loaded from the external JS file
document.addEventListener('DOMContentLoaded', () => {
    if (typeof divisions_bn !== 'undefined') {
        const searchDiv = document.getElementById('searchDivision');
        const regDiv = document.getElementById('regDivision');
        
        divisions_bn.forEach(div => {
            const option1 = new Option(div.title, div.value);
            const option2 = new Option(div.title, div.value);
            searchDiv.add(option1);
            regDiv.add(option2);
        });
    }
});

function loadDistricts(prefix) {
    const divId = document.getElementById(`${prefix}Division`).value;
    const distSelect = document.getElementById(`${prefix}District`);
    distSelect.innerHTML = '<option value="">জেলা নির্বাচন করুন</option>';
    
    if (divId && typeof districts_bn !== 'undefined' && districts_bn[divId]) {
        distSelect.disabled = false;
        districts_bn[divId].forEach(dist => {
            distSelect.add(new Option(dist.title, dist.title)); // Saving title directly to DB for simplicity
        });
    } else {
        distSelect.disabled = true;
    }
}

// --- Advanced Donor Search ---
async function fetchDonors() {
    const name = document.getElementById('searchName').value.trim();
    const phone = document.getElementById('searchPhone').value.trim();
    const bloodType = document.getElementById('searchBloodGroup').value;
    const district = document.getElementById('searchDistrict').value;
    
    const loader = document.getElementById('loader');
    const donorList = document.getElementById('donorList');
    
    loader.style.display = 'block';
    donorList.innerHTML = '';

    // Dynamic SQL Query Builder
    let sql = "SELECT fullName, phone, bloodType, district, area FROM donors WHERE status = 'Available'";
    let args = [];

    if (name) { sql += " AND fullName LIKE ?"; args.push({ type: "text", value: `%${name}%` }); }
    if (phone) { sql += " AND phone LIKE ?"; args.push({ type: "text", value: `%${phone}%` }); }
    if (bloodType) { sql += " AND bloodType = ?"; args.push({ type: "text", value: bloodType }); }
    if (district) { sql += " AND district = ?"; args.push({ type: "text", value: district }); }

    sql += " LIMIT 50";

    const requestBody = {
        requests: [
            { type: "execute", stmt: { sql: sql, args: args } },
            { type: "close" }
        ]
    };

    try {
        const response = await fetch(TURSO_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        const resultData = data.results[0].response.result;
        
        if (resultData && resultData.rows.length > 0) {
            const cols = resultData.cols.map(c => c.name);
            resultData.rows.forEach(row => {
                let donor = {};
                row.forEach((val, index) => { donor[cols[index]] = val.value; });

                const card = document.createElement('div');
                card.className = 'donor-card';
                card.innerHTML = `
                    <span class="blood-badge">${donor.bloodType}</span>
                    <h3>${donor.fullName}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${donor.district || 'N/A'}</p>
                    <p><i class="fa-solid fa-phone"></i> ${donor.phone}</p>
                    <a href="tel:${donor.phone}" class="btn-primary w-100" style="text-align:center;"><i class="fa-solid fa-phone-volume"></i> কল করুন</a>
                `;
                donorList.appendChild(card);
            });
        } else {
            donorList.innerHTML = '<p style="text-align:center; width:100%;">কোনো ডোনার পাওয়া যায়নি।</p>';
        }
    } catch (error) {
        console.error(error);
        donorList.innerHTML = '<p style="color:red; text-align:center; width:100%;">ডাটাবেস কানেকশন এরর!</p>';
    } finally {
        loader.style.display = 'none';
    }
}

// --- Register Donor ---
document.getElementById('donorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fullName = document.getElementById('regFullName').value;
    const phone = document.getElementById('regPhone').value;
    const bloodType = document.getElementById('regBloodType').value;
    const divisionSel = document.getElementById('regDivision');
    const divisionText = divisionSel.options[divisionSel.selectedIndex].text;
    const district = document.getElementById('regDistrict').value;
    const registrationDate = new Date().toISOString();

    const requestBody = {
        requests: [
            {
                type: "execute",
                stmt: {
                    sql: `INSERT INTO donors (fullName, phone, bloodType, district, area, registrationDate, status) VALUES (?, ?, ?, ?, ?, ?, 'Available')`,
                    args: [
                        { type: "text", value: fullName },
                        { type: "text", value: phone },
                        { type: "text", value: bloodType },
                        { type: "text", value: district },
                        { type: "text", value: divisionText }, // Saving division name in 'area' column for now
                        { type: "text", value: registrationDate }
                    ]
                }
            },
            { type: "close" }
        ]
    };

    const btn = e.target.querySelector('button');
    btn.innerText = "অপেক্ষা করুন...";
    btn.disabled = true;

    try {
        const response = await fetch(TURSO_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${TURSO_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        const data = await response.json();
        if (data.results[0].type === "error") {
            alert('এই নাম্বারটি ইতিমধ্যে নিবন্ধিত!');
        } else {
            alert('সফলভাবে রেজিস্ট্রেশন সম্পন্ন হয়েছে!');
            document.getElementById('donorForm').reset();
            showPage('search');
            fetchDonors();
        }
    } catch (error) {
        alert('সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
        btn.innerText = "রেজিস্ট্রেশন সম্পন্ন করুন";
        btn.disabled = false;
    }
});
