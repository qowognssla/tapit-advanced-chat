const http = require('http');

// Simple API test script
async function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testChat() {
  console.log('=== Testing Chat Application ===\n');
  
  // Test 1: Login as Luke
  console.log('1. Testing login...');
  const loginRes = await makeRequest({
    hostname: 'localhost',
    port: 3001,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'Luke' });
  
  if (loginRes.status === 200) {
    console.log('✅ Login successful');
    const token = loginRes.data.token;
    const user = loginRes.data.user;
    console.log(`   User: ${user.username} (${user._id})`);
    
    // Test 2: Get rooms
    console.log('\n2. Testing get rooms...');
    const roomsRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/rooms',
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (roomsRes.status === 200) {
      console.log(`✅ Got ${roomsRes.data.length} rooms`);
      roomsRes.data.slice(0, 3).forEach(room => {
        const otherUsers = room.users.filter(u => u._id !== user._id);
        console.log(`   Room ${room._id}: Chat with ${otherUsers.map(u => u.username).join(', ')}`);
      });
      
      // Test 3: Send a message
      if (roomsRes.data.length > 0) {
        const firstRoom = roomsRes.data[0];
        console.log(`\n3. Testing send message to room ${firstRoom._id}...`);
        
        const messageRes = await makeRequest({
          hostname: 'localhost',
          port: 3001,
          path: `/api/messages/room/${firstRoom._id}`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }, { content: `Test message from API at ${new Date().toLocaleTimeString()}` });
        
        if (messageRes.status === 200) {
          console.log('✅ Message sent successfully');
          console.log(`   Message ID: ${messageRes.data._id}`);
        } else {
          console.log('❌ Failed to send message:', messageRes.status);
        }
      }
    } else {
      console.log('❌ Failed to get rooms:', roomsRes.status);
    }
  } else {
    console.log('❌ Login failed:', loginRes.status);
  }
  
  // Test 4: Check frontend
  console.log('\n4. Testing frontend...');
  const frontendRes = await makeRequest({
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
  });
  
  if (frontendRes.status === 200) {
    console.log('✅ Frontend is running');
    const hasVueChat = frontendRes.data.includes('vue-advanced-chat');
    console.log(`   Vue Advanced Chat: ${hasVueChat ? '✅ Found' : '❌ Not found'}`);
  } else {
    console.log('❌ Frontend not accessible:', frontendRes.status);
  }
  
  console.log('\n=== Test Complete ===');
  console.log('\nTo test in browser:');
  console.log('1. Open http://localhost:3000');
  console.log('2. Login as Luke, Leia, or Yoda');
  console.log('3. Click on a chat room');
  console.log('4. Send messages!');
}

testChat().catch(console.error);







