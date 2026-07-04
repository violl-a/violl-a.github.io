const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// ============================================
// دالة سحابية: تحديث usedCount عند إنشاء طلب جديد
// ============================================
exports.updateCouponUsage = functions.database
    .ref('/orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const order = snapshot.val();

        if (!order || !order.coupon || !order.coupon.id) {
            console.log('ℹ️ لا يوجد كوبون في هذا الطلب، تخطي التحديث.');
            return null;
        }

        const couponId = order.coupon.id;
        const couponRef = admin.database().ref(`coupons/${couponId}/usedCount`);

        try {
            const result = await couponRef.transaction((current) => {
                return (current || 0) + 1;
            });
            console.log(`✅ تم تحديث usedCount للكوبون ${couponId}. القيمة الجديدة: ${result.snapshot.val()}`);
        } catch (error) {
            console.error(`❌ فشل تحديث usedCount للكوبون ${couponId}:`, error);
        }
        return null;
    });

// ============================================
// دالة سحابية: إرسال إشعار تلغرام (نسخة معدلة بدون ?.)
// ============================================
exports.sendTelegramNotification = functions.database
    .ref('/orders/{orderId}')
    .onCreate(async (snapshot, context) => {
        const order = snapshot.val();
        if (!order) return null;

        const customer = order.customer || {};
        const fullName = customer.fullName || 'غير معروف';
        const phone = customer.phone || 'غير معروف';
        const city = customer.city || 'غير معروف';
        const total = order.total || 0;
        
        let itemsCount = 0;
        if (order.items && order.items.length) {
            itemsCount = order.items.reduce((s, i) => s + i.qty, 0);
        }

        const BOT_TOKEN = '8939506093:AAEPHjNCAYHfFw6kvdegUkpGpSouGghWkB4';
        const CHAT_IDS = ['5086011016', '8750720262'];
        const msg = `🛒 طلب جديد في ڤيولا!\n━━━━━━━━━━━━━━\n👤 العميل: ${fullName}\n📱 الهاتف: ${phone}\n📍 المدينة: ${city}\n💰 المبلغ: ${total} $\n📦 عدد المنتجات: ${itemsCount}\n⏰ الوقت: ${new Date().toLocaleString('ar-SY')}`;

        try {
            const fetch = require('node-fetch');
            for (const chatId of CHAT_IDS) {
                await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' })
                });
            }
            console.log('✅ تم إرسال إشعار تلغرام');
        } catch (err) {
            console.error('❌ فشل إرسال إشعار تلغرام:', err);
        }
        return null;
    });