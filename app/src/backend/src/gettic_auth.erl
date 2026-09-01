-module(gettic_auth).
-behaviour(gen_server).

-export([start_link/0]).
-export([init/1, handle_call/3, handle_cast/2, handle_info/2, terminate/2]).
-export([register_user/3, login/2, logout/1, verify_token/1]).
-export([generate_token/1, validate_token/1]).

-define(SERVER, ?MODULE).

start_link() ->
    gen_server:start_link({local, ?SERVER}, ?MODULE, [], []).

init([]) ->
    {ok, #{users => #{}, tokens => #{}}}.

register_user(Username, Email, Password) ->
    gen_server:call(?SERVER, {register_user, Username, Email, Password}).

login(Email, Password) ->
    gen_server:call(?SERVER, {login, Email, Password}).

logout(Token) ->
    gen_server:call(?SERVER, {logout, Token}).

verify_token(Token) ->
    gen_server:call(?SERVER, {verify_token, Token}).

generate_token(UserId) ->
    Token = base64:encode(crypto:strong_rand_bytes(32)),
    {Token, UserId}.

validate_token(Token) ->
    try
        base64:decode(Token),
        true
    catch
        _Error:_Reason ->
            false
    end.

handle_call({register_user, Username, Email, Password}, _From, State) ->
    Users = maps:get(users, State),
    
    case maps:is_key(Email, Users) of
        true ->
            {reply, {error, email_exists}, State};
        false ->
            UserId = list_to_binary("user_" ++ integer_to_list(erlang:unique_integer([positive]))),
            PasswordHash = crypto:hash(sha256, Password),
            
            NewUser = #{
                id => UserId,
                username => Username,
                email => Email,
                password_hash => PasswordHash,
                created_at => erlang:system_time(millisecond)
            },
            
            NewUsers = maps:put(Email, NewUser, Users),
            {reply, {ok, UserId}, State#{users => NewUsers}}
    end;

handle_call({login, Email, Password}, _From, State) ->
    Users = maps:get(users, State),
    
    case maps:find(Email, Users) of
        {ok, User} ->
            PasswordHash = crypto:hash(sha256, Password),
            StoredHash = maps:get(password_hash, User),
            
            case PasswordHash =:= StoredHash of
                true ->
                    UserId = maps:get(id, User),
                    {Token, _} = generate_token(UserId),
                    Tokens = maps:get(tokens, State),
                    NewTokens = maps:put(Token, UserId, Tokens),
                    {reply, {ok, Token, UserId}, State#{tokens => NewTokens}};
                false ->
                    {reply, {error, invalid_credentials}, State}
            end;
        error ->
            {reply, {error, user_not_found}, State}
    end;

handle_call({logout, Token}, _From, State) ->
    Tokens = maps:get(tokens, State),
    NewTokens = maps:remove(Token, Tokens),
    {reply, ok, State#{tokens => NewTokens}};

handle_call({verify_token, Token}, _From, State) ->
    Tokens = maps:get(tokens, State),
    
    case maps:find(Token, Tokens) of
        {ok, UserId} ->
            {reply, {ok, UserId}, State};
        error ->
            {reply, {error, invalid_token}, State}
    end;

handle_call(_Request, _From, State) ->
    {reply, {error, unknown_request}, State}.

handle_cast(_Msg, State) ->
    {noreply, State}.

handle_info(_Info, State) ->
    {noreply, State}.

terminate(_Reason, _State) ->
    ok.
