/**
 * @gettic/webhook - Gettic Webhook İstemcisi
 * Kullanım: const { WebhookClient } = require('@gettic/webhook');
 */

const axios = require('axios');

class WebhookClient {
    constructor(url, options = {}) {
        this.url = url;
        this.username = options.username || 'Webhook';
        this.avatar = options.avatar || '';
    }

    async send(content, options = {}) {
        try {
            const res = await axios.post(this.url, {
                content: content,
                username: options.username || this.username,
                avatar: options.avatar || this.avatar
            });
            return res.data;
        } catch (e) {
            throw new Error('Webhook gönderimi başarısız: ' + e.message);
        }
    }

    async sendEmbed(embed) {
        let content = '';
        if (embed.title) content += `**${embed.title}**\n`;
        if (embed.description) content += `${embed.description}\n`;
        if (embed.fields) {
            embed.fields.forEach(f => {
                content += `\n**${f.name}**: ${f.value}`;
            });
        }
        if (embed.image) content += `\n${embed.image}`;
        if (embed.footer) content += `\n_${embed.footer}_`;
        if (embed.timestamp) content += `\n*${new Date().toISOString()}*`;
        return this.send(content);
    }

    async sendFile(filePath, message) {
        const content = `${message || ''}\n📎 Dosya: ${filePath}`;
        return this.send(content);
    }
}

module.exports = { WebhookClient };
