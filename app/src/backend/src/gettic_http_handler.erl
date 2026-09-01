-module(gettic_http_handler).
-behaviour(cowboy_handler).

-export([init/2]).

init(Req0, State) ->
    Method = cowboy_req:method(Req0),
    Path = cowboy_req:path(Req0),
    
    case handle_request(Method, Path, Req0) of
        {ok, Req} ->
            {ok, Req, State};
        {error, Reason} ->
            Req = cowboy_req:reply(500,
                #{<<"content-type">> => <<"application/json">>},
                jsx:encode(#{error => Reason}),
                Req0),
            {ok, Req, State}
    end.

handle_request(<<"POST">>, <<"/api/v1/auth/register">>, Req) ->
    {ok, Body, Req1} = cowboy_req:read_body(Req),
    try
        Data = jsx:decode(Body, [return_maps]),
        handle_register(Data, Req1)
    catch
        _Error:_Reason ->
            Req2 = cowboy_req:reply(400,
                #{<<"content-type">> => <<"application/json">>},
                jsx:encode(#{error => <<"Invalid JSON">>}),
                Req1),
            {ok, Req2}
    end;

handle_request(<<"POST">>, <<"/api/v1/auth/login">>, Req) ->
    {ok, Body, Req1} = cowboy_req:read_body(Req),
    try
        Data = jsx:decode(Body, [return_maps]),
        handle_login(Data, Req1)
    catch
        _Error:_Reason ->
            Req2 = cowboy_req:reply(400,
                #{<<"content-type">> => <<"application/json">>},
                jsx:encode(#{error => <<"Invalid JSON">>}),
                Req1),
            {ok, Req2}
    end;

handle_request(<<"POST">>, <<"/api/v1/auth/logout">>, Req) ->
    Req1 = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(#{success => true}),
        Req),
    {ok, Req1};

handle_request(<<"GET">>, <<"/api/v1/auth/me">>, Req) ->
    Req1 = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(#{userId => <<"test_user">>, username => <<"test">>}),
        Req),
    {ok, Req1};

handle_request(<<"GET">>, <<"/api/v1/time">>, Req) ->
    Timestamp = erlang:system_time(millisecond),
    Req1 = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(#{timestamp => Timestamp}),
        Req),
    {ok, Req1};

handle_request(_Method, _Path, Req) ->
    Req1 = cowboy_req:reply(404,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(#{error => <<"Not found">>}),
        Req),
    {ok, Req1}.

handle_register(#{<<"username">> := Username, <<"email">> := Email, <<"password">> := Password}, Req) ->
    UserId = list_to_binary("user_" ++ integer_to_list(erlang:unique_integer([positive]))),
    DeviceId = list_to_binary("device_" ++ integer_to_list(erlang:unique_integer([positive]))),
    AccessToken = base64:encode(crypto:strong_rand_bytes(32)),
    RefreshToken = base64:encode(crypto:strong_rand_bytes(32)),
    
    Response = #{
        userId => UserId,
        username => Username,
        email => Email,
        deviceId => DeviceId,
        accessToken => AccessToken,
        refreshToken => RefreshToken,
        expiresIn => 3600
    },
    
    Req1 = cowboy_req:reply(201,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(Response),
        Req),
    {ok, Req1}.

handle_login(#{<<"email">> := Email, <<"password">> := _Password}, Req) ->
    UserId = list_to_binary("user_" ++ integer_to_list(erlang:unique_integer([positive]))),
    DeviceId = list_to_binary("device_" ++ integer_to_list(erlang:unique_integer([positive]))),
    AccessToken = base64:encode(crypto:strong_rand_bytes(32)),
    RefreshToken = base64:encode(crypto:strong_rand_bytes(32)),
    
    Response = #{
        userId => UserId,
        email => Email,
        deviceId => DeviceId,
        accessToken => AccessToken,
        refreshToken => RefreshToken,
        expiresIn => 3600
    },
    
    Req1 = cowboy_req:reply(200,
        #{<<"content-type">> => <<"application/json">>},
        jsx:encode(Response),
        Req),
    {ok, Req1}.
