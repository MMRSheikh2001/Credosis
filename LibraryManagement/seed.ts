import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize } from './config/database';
import { User } from './models';

async function seed() {
    const email = process.env.LIBRARIAN_EMAIL ?? 'librarian@library.com';
    const password = process.env.LIBRARIAN_PASSWORD ?? '1234';

    await sequelize.sync({ alter: true });

    const [user, created] = await User.findOrCreate({
        where: { email },
        defaults: {
            name: 'Head Librarian',
            email,
            password: await bcrypt.hash(password, 10),
            isLibrarian: true,
        },
    });

    if (created) {
        console.log(`Librarian created: ${email}`);
    } else if (!user.isLibrarian) {
        user.isLibrarian = true;
        await user.save();
        console.log(`Existing user promoted to librarian: ${email}`);
    } else {
        console.log(`Librarian already exists: ${email}`);
    }

    await sequelize.close();
}

seed().catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
});