-module(gettic_app).
-behaviour(application).

-export([start/2, stop/1]).
-export([start/0, stop/0]).

start() ->
    application:ensure_all_started(gettic).

stop() ->
    application:stop(gettic).

start(_StartType, _StartArgs) ->
    gettic_sup:start_link().

stop(_State) ->
    ok.
