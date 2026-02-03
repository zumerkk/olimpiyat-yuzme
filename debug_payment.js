const mongoose = require('mongoose');
const Payment = require('./backend/models/Payment');
const Athlete = require('./backend/models/Athlete');
const config = require('./backend/config/config');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/olimpiyat', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const athlete = await Athlete.findOne({ firstName: 'Mehmet Efe', lastName: 'Perk' });
            if (!athlete) {
                console.log('Athlete Mehmet Efe Perk not found');
                return;
            }
            console.log('Athlete Found:', {
                id: athlete._id,
                name: `${athlete.firstName} ${athlete.lastName}`,
                membershipType: athlete.membershipType,
                packageRenewCount: athlete.packageRenewCount
            });

            const payments = await Payment.find({ athlete: athlete._id });
            console.log(`Found ${payments.length} payments.`);

            payments.forEach(p => {
                console.log('Payment:', {
                    id: p._id,
                    paymentType: p.paymentType,
                    amount: p.amount,
                    status: p.status,
                    period: p.period,
                    packageNumber: p.packageNumber,
                    dueDate: p.dueDate
                });
            });

        } catch (err) {
            console.error(err);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => console.error(err));
