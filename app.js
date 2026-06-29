// আপনার দেওয়া Turso Database Credentials
const TURSO_URL = "https://rokto-rokto.aws-ap-northeast-1.turso.io/v2/pipeline";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODI3MTE2OTksImlkIjoiMDE5ZDNiNTktMjMwMS03MmYxLTg5MzQtNGVjMzg1ZjY3ZTQ0IiwicmlkIjoiZjk3OTZhNjctYzI5Ni00YTQ4LWIxNzYtYzAwYWI2ODg2ZmJiIn0.FrG-Keodd1Kl2PfxEGsY30xndaZiwngmxVMShQ800LSs8n7mf6QWKYdGH97PGHz8FKJn9uU-chqM_LIYy5MUAQ";

// ডাইনামিক ডেটা রিড (Read Data from Turso)
async function fetchDonors() {
    const bloodGroupFilter = document.getElementById('searchBloodGroup').value;
    const loader = document.getElementById('loader');
    const donorList = document.getElementById('donorList');
    
    loader.style.display = 'block';
    donorList.innerHTML = '';

    // SQL Query Preparation
    let sql = "SELECT fullName, phone, bloodType, district, area FROM donors WHERE status = 'Available'";
    let args = [];

    if (bloodGroupFilter) {
        sql += " AND bloodType = ?";
        args.push({ type: "text", value: bloodGroupFilter });
    }

    sql += " ORDER BY registrationDate DESC LIMIT 50";

    const requestBody = {
        requests: [
            { type: "execute", stmt: { sql: sql, args: args } },
            { type: "close" }
        ]
    };

    try {
        const response = await fetch(TURSO_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TURSO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        
        // Turso returns a complex nested object. Parsing it securely:
        const resultData = data.results[0].response.result;
        
        if (resultData && resultData.rows.length > 0) {
            const cols = resultData.cols.map(c => c.name);
            
            resultData.rows.forEach(row => {
                // Map values to column names
                let donor = {};
                row.forEach((val, index) => {
                    donor[cols[index]] = val.value;
                });

                // Create Donor Card UI
                const card = document.createElement('div');
                card.className = 'donor-card';
                card.innerHTML = `
                    <span class="blood-badge">${donor.bloodType}</span>
                    <h3>${donor.fullName}</h3>
                    <p><i class="fa-solid fa-location-dot"></i> ${donor.area}, ${donor.district}</p>
                    <p><i class="fa-solid fa-phone"></i> ${donor.phone}</p>
                    <a href="tel:${donor.phone}" class="btn-secondary" style="display:inline-block; margin-top:10px; padding: 8px 15px; font-size:14px;"><i class="fa-solid fa-phone-volume"></i> কল করুন</a>
                `;
                donorList.appendChild(card);
            });
        } else {
            donorList.innerHTML = '<p style="grid-column: 1/-1; text-align:center; padding: 20px;">কোনো ডোনার পাওয়া যায়নি।</p>';
        }
    } catch (error) {
        console.error("Database connection error:", error);
        donorList.innerHTML = '<p style="color:red; text-align:center;">ডাটাবেস কানেকশন এরর!</p>';
    } finally {
        loader.style.display = 'none';
    }
}

// নতুন ডোনার রেজিস্ট্রেশন (Write Data to Turso)
document.getElementById('donorForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fullName = document.getElementById('fullName').value;
    const phone = document.getElementById('phone').value;
    const bloodType = document.getElementById('bloodType').value;
    const district = document.getElementById('district').value;
    const area = document.getElementById('area').value;
    const registrationDate = new Date().toISOString();

    const requestBody = {
        requests: [
            {
                type: "execute",
                stmt: {
                    sql: `INSERT INTO donors (fullName, phone, bloodType, district, area, registrationDate, status, role, totalDonations) VALUES (?, ?, ?, ?, ?, ?, 'Available', 'user', 0)`,
                    args: [
                        { type: "text", value: fullName },
                        { type: "text", value: phone },
                        { type: "text", value: bloodType },
                        { type: "text", value: district },
                        { type: "text", value: area },
                        { type: "text", value: registrationDate }
                    ]
                }
            },
            { type: "close" }
        ]
    };

    const btn = e.target.querySelector('button');
    const originalText = btn.innerText;
    btn.innerText = "অপেক্ষা করুন...";
    btn.disabled = true;

    try {
        const response = await fetch(TURSO_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${TURSO_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        // Check if there's any error in the first request (e.g. PRIMARY KEY constraint on phone)
        if (data.results[0].type === "error") {
            alert('এই ফোন নাম্বার দিয়ে ইতিমধ্যে রেজিস্ট্রেশন করা হয়েছে!');
        } else {
            alert('সফলভাবে ডোনার হিসেবে রেজিস্ট্রেশন সম্পন্ন হয়েছে!');
            document.getElementById('donorForm').reset();
            fetchDonors(); // Reload the list
        }
    } catch (error) {
        console.error("Error saving data:", error);
        alert('কোথাও কোনো সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// পেজ লোড হওয়ার সাথে সাথে সব ডোনার লিস্ট দেখাবে
window.onload = fetchDonors;
