-module(gettic_ws_handler).
-behaviour(cowboy_websocket).

-export([init/2]).
-export([websocket_init/1]).
-export([websocket_handle/2]).
-export([websocket_info/2]).
-export([terminate/3]).
-export([start_link/0]).

start_link() ->
    {ok, spawn_link(fun init_ws/0)}.

init_ws() ->
    Dispatch = cowboy_router:compile([
        {'_', [
            {"/ws", ?MODULE, []},
            {"/api/v1/[...]", gettic_http_handler, []}
        ]}
    ]),
    
    {ok, _} = cowboy:start_clear(gettic_ws_listener,
        [{port, 8080}],
        #{env => #{dispatch => Dispatch}}
    ),
    
    receive
        stop -> ok
    end.

init(Req, State) ->
    case cowboy_req:parse_header(<<"sec-websocket-protocol">>, Req) of
        undefined ->
            {cowboy_websocket, Req, State};
        _Protocols ->
            {cowboy_websocket, Req, State, #{idle_timeout => 60000}}
    end.

websocket_init(State) ->
    erlang:start_timer(30000, self(), heartbeat),
    {ok, State}.

websocket_handle({text, Message}, State) ->
    try
        Data = jsx:decode(Message, [return_maps]),
        handle_message(Data, State)
    catch
        _Error:_Reason ->
            {reply, {text, jsx:encode(#{type => <<"error">>, message => <<"Invalid JSON">>})}, State}
    end;

websocket_handle({ping, _}, State) ->
    {ok, State};

websocket_handle({pong, _}, State) ->
    {ok, State};

websocket_handle(_Frame, State) ->
    {ok, State}.

websocket_info({timeout, _Ref, heartbeat}, State) ->
    {reply, {text, jsx:encode(#{type => <<"pong">>, timestamp => erlang:system_time(millisecond)})}, State};

websocket_info({send_message, Message}, State) ->
    {reply, {text, jsx:encode(Message)}, State};

websocket_info(_Info, State) ->
    {ok, State}.

terminate(_Reason, _Req, _State) ->
    ok.

handle_message(#{<<"type">> := <<"ping">>}, State) ->
    Response = #{type => <<"pong">>, timestamp => erlang:system_time(millisecond)},
    {reply, {text, jsx:encode(Response)}, State};

handle_message(#{<<"type">> := <<"presence">>, <<"status">> := Status}, State) ->
    Response = #{type => <<"presence_update">>, status => Status},
    {reply, {text, jsx:encode(Response)}, State};

handle_message(#{<<"type">> := <<"typing">>, <<"conversationId">> := ConvId, <<"isTyping">> := IsTyping}, State) ->
    Response = #{type => <<"typing_update">>, conversationId => ConvId, isTyping => IsTyping},
    {reply, {text, jsx:encode(Response)}, State};

handle_message(_Data, State) ->
    {ok, State}.
