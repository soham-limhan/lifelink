const randomPhone = Math.floor(1000000000 + Math.random() * 9000000000).toString();

async function testFlow() {
  console.log('--- TESTING REGISTRATION ---');
  const registerRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Verification Test', phone: randomPhone, password: 'securepassword123', role: 'ambulance' })
  });
  const registerData = await registerRes.json();
  
  if (registerRes.ok) {
    console.log('✅ Registration SUCCESS!');
    console.log(`Document ID in Firestore: ${registerData.user.id}`);
    console.log(`Phone: ${registerData.user.phone}, Role: ${registerData.user.role}`);
  } else {
    console.error('❌ Registration FAILED:', registerData.error);
    return;
  }

  console.log('\n--- TESTING LOGIN ---');
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: randomPhone, password: 'securepassword123' })
  });
  const loginData = await loginRes.json();
  
  if (loginRes.ok) {
    console.log('✅ Login SUCCESS!');
    console.log('JWT Token successfully generated.');
    console.log(`Data retrieved from Firestore: Name=${loginData.user.name}, Role=${loginData.user.role}`);
    console.log('\n✅ END-TO-END VERIFICATION COMPLETED SUCCESSFULLY!');
  } else {
    console.error('❌ Login FAILED:', loginData.error);
  }
}

testFlow();
