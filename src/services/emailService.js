// ============================================
// GETTIC - SERVICES/EMAILSERVICE.JS
// Email gönderim servisi
// ============================================

const nodemailer = require('nodemailer');
const { environment } = require('../config/environment');
const { logger } = require('../utils/logger');

// Email transporter oluştur
let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: environment.SMTP_HOST,
        port: environment.SMTP_PORT,
        secure: environment.SMTP_PORT === 465,
        auth: {
            user: environment.SMTP_USER,
            pass: environment.SMTP_PASS
        }
    });

    return transporter;
}

// Email gönder
async function sendEmail({ to, subject, html, text = null }) {
    try {
        const mailOptions = {
            from: environment.SMTP_FROM,
            to,
            subject,
            ...(html && { html }),
            ...(text && { text })
        };

        const info = await getTransporter().sendMail(mailOptions);
        logger.info('Email gönderildi:', info.messageId);
        
        return { success: true, messageId: info.messageId };
    } catch (error) {
        logger.error('Email gönderim hatası:', error);
        return { success: false, error: error.message };
    }
}

// Email şablonları
const emailTemplates = {
    // Hoş geldin emaili
    welcome(username) {
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        background-color: #0a0a0f;
                        color: #f4f4f6;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #12121a;
                        border: 1px solid #1f1f2e;
                        border-radius: 16px;
                        padding: 40px;
                    }
                    .logo {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo h1 {
                        color: #7c3aed;
                        font-size: 32px;
                        margin: 0;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .button {
                        display: inline-block;
                        background-color: #7c3aed;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        color: #6b6b7b;
                        font-size: 12px;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>Gettic</h1>
                    </div>
                    <div class="content">
                        <h2>Hoş Geldin ${username}! 👋</h2>
                        <p>Gettic'e katıldığın için teşekkürler. Artık arkadaşlarınla güvenli ve hızlı bir şekilde mesajlaşabilirsin.</p>
                        <p>Başlamak için aşağıdaki butona tıkla:</p>
                        <a href="${environment.ALLOWED_ORIGINS[0]}/chat.html" class="button">Sohbete Başla</a>
                        <p>İyi sohbetler!</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Gettic. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Şifre sıfırlama emaili
    resetPassword(resetLink) {
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        background-color: #0a0a0f;
                        color: #f4f4f6;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #12121a;
                        border: 1px solid #1f1f2e;
                        border-radius: 16px;
                        padding: 40px;
                    }
                    .logo {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo h1 {
                        color: #7c3aed;
                        font-size: 32px;
                        margin: 0;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .button {
                        display: inline-block;
                        background-color: #7c3aed;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                    .warning {
                        background-color: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        color: #fca5a5;
                        font-size: 14px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        color: #6b6b7b;
                        font-size: 12px;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>Gettic</h1>
                    </div>
                    <div class="content">
                        <h2>Şifre Sıfırlama</h2>
                        <p>Şifreni sıfırlamak için aşağıdaki butona tıkla:</p>
                        <a href="${resetLink}" class="button">Şifreyi Sıfırla</a>
                        <div class="warning">
                            Bu link 1 saat içinde geçerliliğini yitirir. Eğer bu isteği sen yapmadıysan, bu emaili görmezden gelebilirsin.
                        </div>
                    </div>
                    <div class="footer">
                        <p>© 2024 Gettic. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Email doğrulama
    verifyEmail(verifyLink) {
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        background-color: #0a0a0f;
                        color: #f4f4f6;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #12121a;
                        border: 1px solid #1f1f2e;
                        border-radius: 16px;
                        padding: 40px;
                    }
                    .logo {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo h1 {
                        color: #7c3aed;
                        font-size: 32px;
                        margin: 0;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .button {
                        display: inline-block;
                        background-color: #7c3aed;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        color: #6b6b7b;
                        font-size: 12px;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>Gettic</h1>
                    </div>
                    <div class="content">
                        <h2>Email Doğrulama</h2>
                        <p>Email adresini doğrulamak için aşağıdaki butona tıkla:</p>
                        <a href="${verifyLink}" class="button">Emaili Doğrula</a>
                        <p>Bu emaili doğrulayarak hesabının güvenliğini artırmış olursun.</p>
                    </div>
                    <div class="footer">
                        <p>© 2024 Gettic. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    },

    // Yeni bildirim emaili
    newNotification(notificationTitle, notificationContent) {
        return `
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Inter', Arial, sans-serif;
                        background-color: #0a0a0f;
                        color: #f4f4f6;
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        background-color: #12121a;
                        border: 1px solid #1f1f2e;
                        border-radius: 16px;
                        padding: 40px;
                    }
                    .logo {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .logo h1 {
                        color: #7c3aed;
                        font-size: 32px;
                        margin: 0;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .button {
                        display: inline-block;
                        background-color: #7c3aed;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 8px;
                        text-decoration: none;
                        font-weight: 600;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        color: #6b6b7b;
                        font-size: 12px;
                        margin-top: 30px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="logo">
                        <h1>Gettic</h1>
                    </div>
                    <div class="content">
                        <h2>${notificationTitle}</h2>
                        <p>${notificationContent}</p>
                        <a href="${environment.ALLOWED_ORIGINS[0]}/chat.html" class="button">Gettic'e Git</a>
                    </div>
                    <div class="footer">
                        <p>© 2024 Gettic. Tüm hakları saklıdır.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }
};

module.exports = {
    sendEmail,
    emailTemplates
};
