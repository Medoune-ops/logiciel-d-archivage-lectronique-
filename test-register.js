const testData = {
    nom: "Emily",
    prenom: "Johnson",
    email: "emily@newtest.com",
    motDePasse: "NewPass123!",
    organisation: "ACME",
    telephone: "0987654321"
};

console.log('Testing registration with data:', JSON.stringify(testData, null, 2));

fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify(testData)
})
    .then(async res => {
        console.log('\n=== RESPONSE ===');
        console.log('Status:', res.status);
        console.log('Status Text:', res.statusText);
        console.log('Headers:', Object.fromEntries(res.headers.entries()));

        const text = await res.text();
        console.log('\nRaw Body:', text);

        if (res.ok) {
            try {
                const json = JSON.parse(text);
                console.log('\n✅ SUCCESS! Parsed response:', JSON.stringify(json, null, 2));
            } catch (e) {
                console.log('Response is not JSON');
            }
        } else {
            console.log('\n❌ ERROR - Status', res.status);
        }
    })
    .catch(err => console.error('\n❌ FETCH ERROR:', err));
