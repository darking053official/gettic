console.log('🚀 App başlatılıyor...');
console.log('Vue:', typeof Vue);
console.log('store:', typeof store);

if (typeof Vue === 'undefined') {
    document.getElementById('ls').innerHTML = '<div style="color:red;padding:20px;font-family:sans-serif;">Vue.js yüklenemedi! Lütfen sayfayı yenileyin.</div>';
} else {
    const app = Vue.createApp({
        data() {
            return {
                store: store,
                I: typeof I !== 'undefined' ? I : {},
                dmStore: typeof dmStore !== 'undefined' ? dmStore : { friends: [], messages: {}, activeDM: null, dmInput: '' },
                tab: 'login',
                username: '',
                password: '',
                modalInput: '',
                pollQ: '',
                pollO1: '',
                pollO2: '',
                imagePrompt: '',
                generatedImage: null,
                emojis: ['😀','😂','❤️','👍','🔥','🎉','🥳','😎','💯','✅','👋','🙏','🎮','✨']
            };
        },
        methods: {
            submitAuth() {
                if (!this.username || !this.password) return toast('Kullanıcı adı ve şifre gerekli', 'e');
                if (this.tab === 'login') {
                    doLogin(this.username, this.password);
                } else {
                    doRegister(this.username, this.password);
                }
            },
            sendMessage() {
                if (typeof sendMessage === 'function') {
                    sendMessage();
                } else if (this.store.input.trim() && this.store.user) {
                    const msg = {
                        _id: genId(),
                        content: this.store.input.trim(),
                        senderName: this.store.user.username,
                        senderId: this.store.user._id,
                        channelId: this.store.activeChannel.id,
                        createdAt: new Date().toISOString()
                    };
                    this.store.messages.push(msg);
                    this.store.input = '';
                }
            },
            deleteMessage(mid) {
                this.store.messages = this.store.messages.filter(m => m._id !== mid);
                toast('Silindi');
            },
            logout() {
                localStorage.removeItem('gt_token');
                localStorage.removeItem('gt_user');
                this.store.user = null;
                this.store.token = null;
                this.store.messages = [];
                toast('Çıkış yapıldı');
            },
            toggleSidebar() {
                this.store.sidebarOpen = !this.store.sidebarOpen;
            },
            openModal(name) {
                this.store.activeModal = name;
                this.modalInput = '';
                this.pollQ = '';
                this.pollO1 = '';
                this.pollO2 = '';
                this.imagePrompt = '';
                this.generatedImage = null;
            },
            closeModal() {
                this.store.activeModal = null;
            },
            createChannel(name) {
                if (!name || !name.trim()) return;
                const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
                if (this.store.channels.find(c => c.id === id)) return toast('Bu kanal zaten var', 'e');
                this.store.channels.push({ id, name: name.trim(), type: 'text', category: 'METİN' });
                toast(`# ${name} oluşturuldu`);
                this.closeModal();
            },
            switchChannel(ch) {
                this.store.activeChannel = ch;
                this.store.messages = [];
                this.store.sidebarOpen = false;
            },
            startDM(username) {
                if (typeof startDM === 'function') {
                    startDM(username);
                }
                this.closeModal();
            },
            addFriend(username) {
                if (!username || !username.trim()) return;
                if (typeof addFriend === 'function') {
                    addFriend(username);
                } else {
                    if (!this.dmStore.friends.find(f => f.username === username)) {
                        this.dmStore.friends.push({ id: genId(), username, last: '', time: 'Şimdi' });
                    }
                    toast(username + ' eklendi');
                }
                this.closeModal();
            },
            setTheme(c) {
                this.store.theme = c;
                localStorage.setItem('gt_ac', c);
                this.closeModal();
            },
            createPoll(question, opts) {
                if (!question || !opts || opts.length < 2) return;
                const mid = genId();
                const poll = { question, options: opts, votes: new Array(opts.length).fill(0), voters: {} };
                const msg = {
                    _id: mid,
                    content: '📊 ' + question,
                    senderName: this.store.user.username,
                    senderId: this.store.user._id,
                    channelId: this.store.activeChannel.id,
                    createdAt: new Date().toISOString(),
                    poll
                };
                this.store.messages.push(msg);
                toast('Anket başlatıldı');
                this.closeModal();
            },
            votePoll(mid, i) {
                const msg = this.store.messages.find(m => m._id === mid);
                if (!msg?.poll) return;
                if (msg.poll.voters[this.store.user?._id] !== undefined) return toast('Zaten oy verdiniz', 'e');
                msg.poll.voters[this.store.user._id] = i;
                msg.poll.votes[i]++;
            },
            getPollPercent(poll, i) {
                if (!poll) return 0;
                const total = poll.votes.reduce((a, b) => a + b, 0) || 1;
                return Math.round((poll.votes[i] / total) * 100);
            },
            formatTime(d) {
                try {
                    return new Date(d).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
                } catch(e) {
                    return '';
                }
            },
            formatMsg(t) {
                if (!t) return '';
                return t
                    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
                    .replace(/\*(.+?)\*/g, '<i>$1</i>')
                    .replace(/`([^`]+?)`/g, '<code>$1</code>');
            },
            joinVoice(chId) {
                toast('Sesli kanal yakında gelecek', 'w');
            },
            leaveVoice() {},
            async generateImage() {
                if (!this.imagePrompt.trim()) return;
                toast('🎨 Görsel oluşturuluyor...');
                try {
                    const res = await fetch(API + '/api/image', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: this.imagePrompt })
                    });
                    const data = await res.json();
                    if (data.image) {
                        this.generatedImage = data.image;
                        const msg = {
                            _id: genId(),
                            content: '🎨 ' + this.imagePrompt,
                            senderName: this.store.user.username,
                            senderId: this.store.user._id,
                            channelId: this.store.activeChannel.id,
                            createdAt: new Date().toISOString(),
                            image: data.image
                        };
                        this.store.messages.push(msg);
                        this.imagePrompt = '';
                        this.closeModal();
                        toast('✅ Görsel oluşturuldu');
                    } else {
                        toast('❌ Görsel oluşturulamadı', 'e');
                    }
                } catch (e) {
                    toast('❌ Bağlantı hatası', 'e');
                }
            }
        },
            mounted() {
        console.log('✅ Vue mounted, user:', this.store.user);
        const ls = document.getElementById('ls');
        if (ls) ls.remove();
    }
});

    app.mount('#root');
    window.app = app;
    console.log('✅ Vue uygulaması başlatıldı');
                        }
