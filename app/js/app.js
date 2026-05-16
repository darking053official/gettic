console.log('Vue:', typeof Vue);
console.log('store:', typeof store);

if (typeof Vue === 'undefined') {
    document.getElementById('ls').innerHTML = '<div style="color:red;padding:20px;">Vue yüklenemedi!</div>';
} else {
    const app = Vue.createApp({
        data() {
            return {
                store: store,
                I: I,
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
                if (this.tab === 'login') doLogin(this.username, this.password);
                else doRegister(this.username, this.password);
            },
            sendMessage: typeof sendMessage !== 'undefined' ? sendMessage : function() { toast('Mesaj fonksiyonu yok', 'e'); },
            deleteMessage: typeof deleteMessage !== 'undefined' ? deleteMessage : function(mid) { store.messages = store.messages.filter(m => m._id !== mid); },
            logout: typeof logout !== 'undefined' ? logout : function() { store.user = null; store.token = null; },
            toggleSidebar() { store.sidebarOpen = !store.sidebarOpen; },
            openModal(name) { store.activeModal = name; },
            closeModal() { store.activeModal = null; },
            createChannel: typeof createChannel !== 'undefined' ? createChannel : function(name) { 
                if (!name) return; 
                const id = name.toLowerCase().replace(/\s+/g,'-');
                store.channels.push({ id, name, type: 'text', category: 'METİN' });
            },
            switchChannel(ch) { store.activeChannel = ch; store.messages = []; store.sidebarOpen = false; },
            startDM: typeof startDM !== 'undefined' ? startDM : function(u) { toast('DM yakında', 'w'); },
            addFriend: typeof addFriend !== 'undefined' ? addFriend : function(u) { toast(u + ' eklendi'); },
            setTheme(c) { store.theme = c; localStorage.setItem('gt_ac', c); },
            createPoll: typeof createPoll !== 'undefined' ? createPoll : function(q, opts) { toast('Anket oluşturuldu'); },
            votePoll(mid, i) { 
                const msg = store.messages.find(m => m._id === mid);
                if (msg?.poll && msg.poll.voters[store.user?._id] === undefined) {
                    msg.poll.voters[store.user._id] = i;
                    msg.poll.votes[i]++;
                }
            },
            joinVoice: typeof joinVoice !== 'undefined' ? joinVoice : function() { toast('Ses yakında', 'w'); },
            leaveVoice: typeof leaveVoice !== 'undefined' ? leaveVoice : function() {},
            getPollPercent(poll, i) {
                if (!poll) return 0;
                const total = poll.votes.reduce((a,b)=>a+b,0) || 1;
                return Math.round((poll.votes[i]/total)*100);
            },
            formatTime(d) { return new Date(d).toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}); },
            formatMsg(t) { 
                if (!t) return '';
                return t.replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>').replace(/`([^`]+?)`/g,'<code>$1</code>');
            },
            async generateImage() {
                if (!this.imagePrompt.trim()) return;
                try {
                    const res = await fetch(API+'/api/image', {
                        method:'POST',
                        headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({prompt:this.imagePrompt})
                    });
                    const data = await res.json();
                    if (data.image) {
                        this.generatedImage = data.image;
                        store.messages.push({
                            _id: genId(),
                            content: '🎨 ' + this.imagePrompt,
                            senderName: store.user.username,
                            senderId: store.user._id,
                            channelId: store.activeChannel.id,
                            createdAt: new Date().toISOString(),
                            image: data.image
                        });
                        this.imagePrompt = '';
                    } else {
                        toast('Görsel oluşturulamadı', 'e');
                    }
                } catch(e) { toast('Bağlantı hatası', 'e'); }
            }
        },
        mounted() {
            setTimeout(() => {
                const ls = document.getElementById('ls');
                if (ls) ls.classList.add('hide');
            }, 500);
        }
    });

    app.mount('#root');
    window.app = app;
              }
