-module(gettic_sup).
-behaviour(supervisor).

-export([start_link/0]).
-export([init/1]).

-define(SERVER, ?MODULE).

start_link() ->
    supervisor:start_link({local, ?SERVER}, ?MODULE, []).

init([]) ->
    SupFlags = #{strategy => one_for_one,
                 intensity => 10,
                 period => 10},
    
    Children = [
        #{id => gettic_ws_handler,
          start => {gettic_ws_handler, start_link, []},
          restart => permanent,
          shutdown => 5000,
          type => worker,
          modules => [gettic_ws_handler]},
        
        #{id => gettic_auth,
          start => {gettic_auth, start_link, []},
          restart => permanent,
          shutdown => 5000,
          type => worker,
          modules => [gettic_auth]},
        
        #{id => gettic_db,
          start => {gettic_db, start_link, []},
          restart => permanent,
          shutdown => 5000,
          type => worker,
          modules => [gettic_db]}
    ],
    
    {ok, {SupFlags, Children}}.
