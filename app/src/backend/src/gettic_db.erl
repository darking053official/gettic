-module(gettic_db).
-behaviour(gen_server).

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).
-export([save_message/1, get_messages/1, delete_message/1]).
-export([save_conversation/1, get_conversation/1, get_conversations/0]).
-export([save_user/1, get_user/1, get_user_by_email/1]).
-export([save_prekey/1, get_prekey/1, get_unused_prekeys/0]).

-define(SERVER, ?MODULE).

start_link() ->
    gen_server:start_link({local, ?SERVER}, ?MODULE, [], []).

init([]) ->
    {ok, #{
        messages => #{},
        conversations => #{},
        users => #{},
        prekeys => #{}
    }}.

save_message(Message) ->
    gen_server:call(?SERVER, {save_message, Message}).

get_messages(ConversationId) ->
    gen_server:call(?SERVER, {get_messages, ConversationId}).

delete_message(MessageId) ->
    gen_server:call(?SERVER, {delete_message, MessageId}).

save_conversation(Conversation) ->
    gen_server:call(?SERVER, {save_conversation, Conversation}).

get_conversation(ConversationId) ->
    gen_server:call(?SERVER, {get_conversation, ConversationId}).

get_conversations() ->
    gen_server:call(?SERVER, get_conversations).

save_user(User) ->
    gen_server:call(?SERVER, {save_user, User}).

get_user(UserId) ->
    gen_server:call(?SERVER, {get_user, UserId}).

get_user_by_email(Email) ->
    gen_server:call(?SERVER, {get_user_by_email, Email}).

save_prekey(Prekey) ->
    gen_server:call(?SERVER, {save_prekey, Prekey}).

get_prekey(PrekeyId) ->
    gen_server:call(?SERVER, {get_prekey, PrekeyId}).

get_unused_prekeys() ->
    gen_server:call(?SERVER, get_unused_prekeys).

handle_call({save_message, Message}, _From, State) ->
    Messages = maps:get(messages, State),
    MessageId = maps:get(id, Message),
    NewMessages = maps:put(MessageId, Message, Messages),
    {reply, {ok, MessageId}, State#{messages => NewMessages}};

handle_call({get_messages, ConversationId}, _From, State) ->
    Messages = maps:get(messages, State),
    ConversationMessages = maps:filter(
        fun(_Id, Msg) -> 
            maps:get(conversationId, Msg) =:= ConversationId 
        end, 
        Messages
    ),
    SortedMessages = lists:sort(
        fun(A, B) -> 
            maps:get(timestamp, A) =< maps:get(timestamp, B) 
        end,
        maps:values(ConversationMessages)
    ),
    {reply, {ok, SortedMessages}, State};

handle_call({delete_message, MessageId}, _From, State) ->
    Messages = maps:get(messages, State),
    NewMessages = maps:remove(MessageId, Messages),
    {reply, ok, State#{messages => NewMessages}};

handle_call({save_conversation, Conversation}, _From, State) ->
    Conversations = maps:get(conversations, State),
    ConversationId = maps:get(id, Conversation),
    NewConversations = maps:put(ConversationId, Conversation, Conversations),
    {reply, {ok, ConversationId}, State#{conversations => NewConversations}};

handle_call({get_conversation, ConversationId}, _From, State) ->
    Conversations = maps:get(conversations, State),
    
    case maps:find(ConversationId, Conversations) of
        {ok, Conversation} ->
            {reply, {ok, Conversation}, State};
        error ->
            {reply, {error, not_found}, State}
    end;

handle_call(get_conversations, _From, State) ->
    Conversations = maps:get(conversations, State),
    SortedConversations = lists:sort(
        fun(A, B) -> 
            maps:get(updatedAt, A) >= maps:get(updatedAt, B) 
        end,
        maps:values(Conversations)
    ),
    {reply, {ok, SortedConversations}, State};

handle_call({save_user, User}, _From, State) ->
    Users = maps:get(users, State),
    UserId = maps:get(id, User),
    NewUsers = maps:put(UserId, User, Users),
    {reply, {ok, UserId}, State#{users => NewUsers}};

handle_call({get_user, UserId}, _From, State) ->
    Users = maps:get(users, State),
    
    case maps:find(UserId, Users) of
        {ok, User} ->
            {reply, {ok, User}, State};
        error ->
            {reply, {error, not_found}, State}
    end;

handle_call({get_user_by_email, Email}, _From, State) ->
    Users = maps:get(users, State),
    
    case lists:keyfind(Email, 1, [{maps:get(email, U), U} || U <- maps:values(Users)]) of
        {Email, User} ->
            {reply, {ok, User}, State};
        false ->
            {reply, {error, not_found}, State}
    end;

handle_call({save_prekey, Prekey}, _From, State) ->
    Prekeys = maps:get(prekeys, State),
    PrekeyId = maps:get(id, Prekey),
    NewPrekeys = maps:put(PrekeyId, Prekey, Prekeys),
    {reply, {ok, PrekeyId}, State#{prekeys => NewPrekeys}};

handle_call({get_prekey, PrekeyId}, _From, State) ->
    Prekeys = maps:get(prekeys, State),
    
    case maps:find(PrekeyId, Prekeys) of
        {ok, Prekey} ->
            {reply, {ok, Prekey}, State};
        error ->
            {reply, {error, not_found}, State}
    end;

handle_call(get_unused_prekeys, _From, State) ->
    Prekeys = maps:get(prekeys, State),
    UnusedPrekeys = maps:filter(
        fun(_Id, Prekey) -> 
            maps:get(used, Prekey) =:= false 
        end,
        Prekeys
    ),
    {reply, {ok, maps:values(UnusedPrekeys)}, State};

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
