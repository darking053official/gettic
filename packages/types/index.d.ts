/**
 * @gettic/types - Gettic TypeScript Tip Tanımları
 */

declare module '@gettic/core' {
    interface ClientOptions {
        url?: string;
        token?: string;
        username?: string;
        prefix?: string;
    }

    interface MessageContext {
        message: Message;
        args: string[];
        room: string;
        sender: string;
        reply: (text: string) => Client;
        delete: () => Promise<any>;
        edit: (text: string) => Promise<any>;
    }

    interface Embed {
        title?: string;
        description?: string;
        color?: string;
        fields?: { name: string; value: string }[];
        image?: string;
        footer?: string;
        timestamp?: boolean;
    }

    class Client extends EventEmitter {
        constructor(options?: ClientOptions);
        connect(): Promise<Client>;
        send(room: string, content: string): Client;
        sendEmbed(room: string, embed: Embed): Client;
        command(name: string, handler: (ctx: MessageContext) => void): Client;
        destroy(): void;
    }

    export { Client, ClientOptions, MessageContext, Embed };
}

declare module '@gettic/voice' {
    class VoiceClient extends EventEmitter {
        constructor(client: any, options?: { bitrate?: number });
        join(roomId: string): Promise<void>;
        leave(): Promise<void>;
        mute(): void;
        unmute(): void;
    }
    export { VoiceClient };
}

declare module '@gettic/webhook' {
    class WebhookClient {
        constructor(url: string, options?: { username?: string });
        send(content: string): Promise<any>;
        sendEmbed(embed: any): Promise<any>;
    }
    export { WebhookClient };
}

declare module '@gettic/rest' {
    class RESTClient {
        constructor(options?: { url?: string; token?: string });
        getProfile(): Promise<any>;
        getRooms(): Promise<any>;
        createRoom(name: string): Promise<any>;
        getMessages(roomId: string): Promise<any>;
    }
    export { RESTClient };
  }
