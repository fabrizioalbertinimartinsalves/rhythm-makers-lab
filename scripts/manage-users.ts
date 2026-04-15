import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Admin SDK
const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service-account.json not found in the root directory.');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const args = process.argv.slice(2);
  const action = args[0]; // create, delete, reset-password

  if (action === 'create') {
    const email = args[1];
    const password = args[2];
    const displayName = args[3];
    const studioId = args[4];
    const rolesString = args[5] || 'student'; // comma separated roles

    if (!email || !password || !displayName) {
      console.log('Usage: npx ts-node scripts/manage-users.ts create <email> <password> <displayName> [studioId] [roles]');
      process.exit(1);
    }

    try {
      console.log(`Creating user: ${email}...`);
      const userRecord = await auth.createUser({
        email,
        password,
        displayName,
      });

      console.log(`Successfully created new user: ${userRecord.uid}`);

      // Create Firestore document
      const roles = rolesString.split(',');
      await db.collection('users').doc(userRecord.uid).set({
        nome: displayName,
        email: email,
        roles: roles,
        role: roles[0], // primary role for safety
        studioId: studioId || null,
        createdAt: new Date().toISOString()
      }, { merge: true });

      // If studioId is provided, create membership
      if (studioId) {
        await db.collection('user_memberships').add({
          userId: userRecord.uid,
          studioId: studioId,
          role: roles
        });
        console.log(`Added membership for studio: ${studioId}`);
      }

      console.log('User provisioning complete!');
    } catch (error) {
      console.error('Error creating user:', error);
    }
  } else if (action === 'delete') {
    const emailOrUid = args[1];
    if (!emailOrUid) {
      console.log('Usage: npx ts-node scripts/manage-users.ts delete <email_or_uid>');
      process.exit(1);
    }

    try {
      let uid = emailOrUid;
      if (emailOrUid.includes('@')) {
        const user = await auth.getUserByEmail(emailOrUid);
        uid = user.uid;
      }

      console.log(`Deleting user: ${uid}...`);
      await auth.deleteUser(uid);
      await db.collection('users').doc(uid).delete();
      
      // Cleanup memberships
      const memberships = await db.collection('user_memberships').where('userId', '==', uid).get();
      const batch = db.batch();
      memberships.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();

      console.log('Successfully deleted user and cleanup Firestore data.');
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  } else {
    console.log('Available actions: create, delete');
    console.log('Example: npx ts-node scripts/manage-users.ts create test@user.com password123 "Test User"');
  }
}

main();
