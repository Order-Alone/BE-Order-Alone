import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://13.209.210.38/api";
const GAME_SECONDS = 60;

const storage = {
  get(key) {
    return window.localStorage.getItem(key);
  },
  set(key, value) {
    window.localStorage.setItem(key, value);
  },
  del(key) {
    window.localStorage.removeItem(key);
  },
};

const formatTime = (seconds) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const FALLBACK_IMAGE =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'>" +
      "<rect width='80' height='80' rx='16' fill='#f3efe9'/>" +
      "<path d='M20 54h40l-10-14-9 10-8-7-13 11z' fill='#d1c7bb'/>" +
      "<circle cx='30' cy='28' r='6' fill='#d1c7bb'/>" +
    "</svg>"
  );

const ImageWithFallback = ({ src, alt, className }) => (
  <img
    className={className}
    src={src || FALLBACK_IMAGE}
    alt={alt}
    onError={(event) => {
      event.currentTarget.onerror = null;
      event.currentTarget.src = FALLBACK_IMAGE;
    }}
  />
);

export default function App() {
  const [accessToken, setAccessToken] = useState(storage.get("oa_access_token"));
  const [refreshToken, setRefreshToken] = useState(storage.get("oa_refresh_token"));

  const [authMode, setAuthMode] = useState("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  const [menus, setMenus] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [selectedMenuId, setSelectedMenuId] = useState("");
  const [menuDetails, setMenuDetails] = useState(null);

  const [gameId, setGameId] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [gameStatus, setGameStatus] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [finalScore, setFinalScore] = useState(null);
  const [view, setView] = useState("home");
  const [topGames, setTopGames] = useState([]);
  const [myGames, setMyGames] = useState([]);
  const [successfulOrders, setSuccessfulOrders] = useState([]);
  const [bestGame, setBestGame] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [topLoading, setTopLoading] = useState(false);
  const [myLoading, setMyLoading] = useState(false);
  const [bestLoading, setBestLoading] = useState(false);
  const [topError, setTopError] = useState("");
  const [myError, setMyError] = useState("");
  const [bestError, setBestError] = useState("");

  const [answerCategory, setAnswerCategory] = useState("");
  const [answerMenuName, setAnswerMenuName] = useState("");
  const [answerToppings, setAnswerToppings] = useState(new Set());

  const categories = useMemo(() => menuDetails?.data || [], [menuDetails]);
  const selectedCategory = useMemo(
    () => categories.find((cat) => cat.kategorie === answerCategory),
    [categories, answerCategory]
  );

  const selectedToppingNames = useMemo(
    () => Array.from(answerToppings.values()),
    [answerToppings]
  );

  const menuItems = useMemo(() => {
    if (!menuDetails?.data?.length) return [];
    if (selectedCategory) {
      return selectedCategory.menus.map((item) => ({
        ...item,
        category: selectedCategory.kategorie,
      }));
    }
    return menuDetails.data.flatMap((category) =>
      category.menus.map((item) => ({
        ...item,
        category: category.kategorie,
      }))
    );
  }, [menuDetails, selectedCategory]);

  const userDisplayName = userProfile?.name ? `${userProfile.name} 님` : "사용자 님";

  const renderHeader = () => (
    <header className="app-header">
      <div className="logo">
        <span className="logo-mark">OA</span>
        <div>
          <strong>Order Alone</strong>
          <span>Solo kiosk</span>
        </div>
      </div>
      <div className="user-info">
        <div className="user-text">
          <span className="user-name">{userDisplayName}</span>
          {userProfile?.account_id && <span className="user-sub">@{userProfile.account_id}</span>}
        </div>
        <button className="ghost" onClick={logout}>
          로그아웃
        </button>
      </div>
    </header>
  );

  const isAuthed = Boolean(accessToken);

  const apiFetch = async (path, options = {}, retry = true) => {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && refreshToken && retry) {
      const refreshed = await fetch(`${API_BASE}/user/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (refreshed.ok) {
        const data = await refreshed.json();
        setAccessToken(data.access_token);
        storage.set("oa_access_token", data.access_token);
        return apiFetch(path, options, false);
      }
    }

    return response;
  };

  const loadMenus = async () => {
    setMenuLoading(true);
    try {
      const response = await apiFetch("/menu/summary");
      if (!response.ok) {
        throw new Error("메뉴 목록을 불러올 수 없습니다.");
      }
      const data = await response.json();
      setMenus(data);
      if (data.length && !selectedMenuId) {
        setSelectedMenuId(data[0].id);
      }
    } catch (error) {
      setGameStatus(error.message);
    } finally {
      setMenuLoading(false);
    }
  };

  const loadUserProfile = async () => {
    try {
      const response = await apiFetch("/user/me");
      if (!response.ok) {
        throw new Error("사용자 정보를 불러올 수 없습니다.");
      }
      const data = await response.json();
      setUserProfile(data);
    } catch {
      setUserProfile(null);
    }
  };

  const loadMenuDetails = async (menuId) => {
    if (!menuId) {
      setMenuDetails(null);
      return;
    }
    try {
      const response = await apiFetch(`/menu/${menuId}`);
      if (!response.ok) {
        throw new Error("메뉴 상세를 불러올 수 없습니다.");
      }
      const data = await response.json();
      setMenuDetails(data);
    } catch (error) {
      setGameStatus(error.message);
    }
  };

  const loadTopGames = async () => {
    setTopLoading(true);
    setTopError("");
    try {
      const response = await apiFetch("/game/top?limit=5");
      if (!response.ok) {
        throw new Error("상위 게임을 불러올 수 없습니다.");
      }
      const data = await response.json();
      setTopGames(data);
    } catch (error) {
      setTopError(error.message);
    } finally {
      setTopLoading(false);
    }
  };

  const loadMyGames = async () => {
    setMyLoading(true);
    setMyError("");
    try {
      const response = await apiFetch("/game?limit=5");
      if (!response.ok) {
        throw new Error("내 게임 기록을 불러올 수 없습니다.");
      }
      const data = await response.json();
      setMyGames(data);
    } catch (error) {
      setMyError(error.message);
    } finally {
      setMyLoading(false);
    }
  };

  const loadBestGame = async () => {
    setBestLoading(true);
    setBestError("");
    try {
      const response = await apiFetch("/game/best");
      if (!response.ok) {
        throw new Error("내 최고 점수를 불러올 수 없습니다.");
      }
      const data = await response.json();
      setBestGame(data);
    } catch (error) {
      setBestError(error.message);
    } finally {
      setBestLoading(false);
    }
  };


  const resetAnswer = () => {
    setAnswerCategory("");
    setAnswerMenuName("");
    setAnswerToppings(new Set());
  };

  const startGame = async (menuId) => {
    const targetMenuId = menuId || menus[0]?.id;
    if (!targetMenuId) {
      setGameStatus("메뉴를 선택해 주세요.");
      return;
    }
    if (!menuId && targetMenuId) {
      setSelectedMenuId(targetMenuId);
    }
    setGameStatus("");
    setFinalScore(null);
    setSuccessfulOrders([]);
    resetAnswer();

    try {
      const response = await apiFetch("/game/start", {
        method: "POST",
        body: JSON.stringify({ menu_id: targetMenuId }),
      });
      if (!response.ok) {
        throw new Error("게임을 시작할 수 없습니다.");
      }
      const data = await response.json();
      const order = data.order;
      setGameId(order.game_id);
      setCurrentOrder(order);
      setRemainingSeconds(GAME_SECONDS);
      setIsRunning(true);
      setView("kiosk");
      await loadMenuDetails(order.menu_id);
    } catch (error) {
      setGameStatus(error.message);
    }
  };

  const endGame = async () => {
    if (!gameId) return;
    setIsRunning(false);
    try {
      const response = await apiFetch("/game/end", {
        method: "POST",
        body: JSON.stringify({ game_id: gameId }),
      });
      if (!response.ok) {
        throw new Error("게임 종료에 실패했습니다.");
      }
      const data = await response.json();
      setFinalScore(data.score ?? 0);
      setGameStatus(`게임 종료! 최종 점수: ${data.score ?? 0}`);
      await loadMyGames();
      await loadBestGame();
      setView("score");
    } catch (error) {
      setGameStatus(error.message);
    }
  };

  const requestNextOrder = async () => {
    if (!gameId) return;
    const response = await apiFetch("/order", {
      method: "POST",
      body: JSON.stringify({ game_id: gameId }),
    });
    if (!response.ok) {
      throw new Error("다음 주문을 생성하지 못했습니다.");
    }
    const data = await response.json();
    setCurrentOrder(data);
  };

  const submitScore = async () => {
    if (!currentOrder || !gameId) return;
    if (!answerCategory || !answerMenuName) {
      setGameStatus("카테고리와 메뉴를 선택해 주세요.");
      return;
    }
    if (!isRunning) {
      setGameStatus("게임이 종료되었습니다.");
      return;
    }
    setGameStatus("");

    try {
      const response = await apiFetch("/order/score", {
        method: "POST",
        body: JSON.stringify({
          order_id: currentOrder.id,
          game_id: gameId,
          category: answerCategory,
          menu_name: answerMenuName,
          topping_names: selectedToppingNames,
        }),
      });
      if (!response.ok) {
        throw new Error("채점에 실패했습니다.");
      }
      const data = await response.json();
      if (data.correct) {
        setGameStatus("정답! 다음 주문으로 넘어갑니다.");
        setSuccessfulOrders((prev) => {
          if (!currentOrder) return prev;
          if (prev.some((order) => order.id === currentOrder.id)) {
            return prev;
          }
          return [currentOrder, ...prev];
        });
      } else {
        setGameStatus(
          `오답! 정답: ${data.expected?.category || ""} / ${data.expected?.menu_name || ""}`
        );
      }
      resetAnswer();
      if (isRunning) {
        await requestNextOrder();
      }
    } catch (error) {
      setGameStatus(error.message);
    }
  };

  const handleAuth = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    const form = new FormData(event.currentTarget);
    const payload = {
      name: form.get("name")?.toString().trim(),
      account_id: form.get("account_id")?.toString().trim(),
      password: form.get("password")?.toString(),
    };

    if (!payload.account_id || !payload.password) {
      setAuthError("아이디와 비밀번호를 입력해 주세요.");
      setAuthLoading(false);
      return;
    }

    try {
      const endpoint = authMode === "signup" ? "/user/signup" : "/user/login";
      const body = authMode === "signup" ? payload : {
        account_id: payload.account_id,
        password: payload.password,
      };

      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error("로그인/회원가입에 실패했습니다.");
      }
      const data = await response.json();
      setAccessToken(data.access_token);
      setRefreshToken(data.refresh_token || refreshToken || "");
      storage.set("oa_access_token", data.access_token);
      if (data.refresh_token) {
        storage.set("oa_refresh_token", data.refresh_token);
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    setAccessToken("");
    setRefreshToken("");
    storage.del("oa_access_token");
    storage.del("oa_refresh_token");
    setMenus([]);
    setMenuDetails(null);
    setSelectedMenuId("");
    setCurrentOrder(null);
    setGameId("");
    setIsRunning(false);
    setFinalScore(null);
    setGameStatus("");
    setTopGames([]);
    setMyGames([]);
    setSuccessfulOrders([]);
    setBestGame(null);
    setUserProfile(null);
    setView("home");
  };

  useEffect(() => {
    if (isAuthed) {
      loadMenus();
      loadTopGames();
      loadMyGames();
      loadBestGame();
      loadUserProfile();
      setView("home");
    }
  }, [isAuthed]);

  useEffect(() => {
    if (selectedMenuId) {
      loadMenuDetails(selectedMenuId);
    }
  }, [selectedMenuId]);

  useEffect(() => {
    if (!isRunning) return;
    const timer = setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && remainingSeconds === 0) {
      void endGame();
    }
  }, [remainingSeconds, isRunning]);

  useEffect(() => {
    if (!answerCategory) {
      setAnswerMenuName("");
      setAnswerToppings(new Set());
    }
  }, [answerCategory]);

  if (!isAuthed) {
    return (
      <div className="app auth">
        <div className="panel">
          <div className="brand">
            <span>ORDER ALONE</span>
            <p>1분 동안 최대 점수를 노려보세요.</p>
          </div>
          <div className="tabs">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => setAuthMode("login")}
            >
              로그인
            </button>
            <button
              type="button"
              className={authMode === "signup" ? "active" : ""}
              onClick={() => setAuthMode("signup")}
            >
              회원가입
            </button>
          </div>
          <form className="form" onSubmit={handleAuth}>
            {authMode === "signup" && (
              <label>
                이름
                <input name="name" placeholder="홍길동" />
              </label>
            )}
            <label>
              아이디
              <input name="account_id" placeholder="kiosk_user" required />
            </label>
            <label>
              비밀번호
              <input name="password" type="password" required />
            </label>
            {authError && <p className="error">{authError}</p>}
            <button type="submit" className="primary" disabled={authLoading}>
              {authLoading ? "처리 중..." : authMode === "signup" ? "회원가입" : "로그인"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (view === "score") {
    return (
      <div className="app kiosk score-view">
        {renderHeader()}
        <main className="panel score-panel">
          <h2>최종 점수</h2>
          <p className="score">{finalScore ?? 0}점</p>
          <p className="status-text">수고했어요! 다시 도전할까요?</p>
          <div className="game-list">
            <div className="game-list-header">
              <h3>내 게임 기록</h3>
              <button type="button" className="ghost" onClick={loadMyGames} disabled={myLoading}>
                새로고침
              </button>
            </div>
            {myLoading && <p>불러오는 중...</p>}
            {myError && <p className="error">{myError}</p>}
            {!myLoading && !myError && myGames.length === 0 && (
              <p>기록이 없습니다.</p>
            )}
            {!myLoading && !myError && myGames.length > 0 && (
              <div className="game-cards">
                {myGames.map((game) => (
                  <div key={game.id} className="game-card">
                    <div>
                      <strong>{game.score ?? 0}</strong>
                      <span>{game.user_name ? `${game.user_name} · ` : ""}{formatDateTime(game.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="game-list">
            <div className="game-list-header">
              <h3>성공한 주문</h3>
            </div>
            {successfulOrders.length === 0 && <p>성공 기록이 없습니다.</p>}
            {successfulOrders.length > 0 && (
              <div className="game-cards">
                {successfulOrders.map((order) => (
                  <div key={order.id} className="game-card">
                    <div>
                      <strong>{order.selection?.item?.name || "메뉴"}</strong>
                      <span>{order.selection?.category || "카테고리"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="primary"
            onClick={() => {
              setView("home");
              setGameStatus("");
              setCurrentOrder(null);
              setGameId("");
              setRemainingSeconds(0);
              setFinalScore(null);
              setSuccessfulOrders([]);
            }}
            >
            새 게임 준비
          </button>
        </main>
      </div>
    );
  }

  if (view === "home") {
    return (
      <div className="app kiosk">
        {renderHeader()}

        <main className="home-layout">
          <div className="score-strip">
            <span>내 최고점수</span>
            <strong>{bestGame?.score ?? 0}점</strong>
            <span className="score-date">
              {bestGame ? formatDateTime(bestGame.date) : "기록 없음"}
            </span>
          </div>
          <div className="home-grid">
            <section className="panel menu-panel">
              <h2>키오스크 메뉴</h2>
              {menuLoading ? (
                <p>메뉴 불러오는 중...</p>
              ) : (
                <div className="menu-list">
                  {menus.map((menu) => (
                    <button
                      key={menu.id}
                      type="button"
                      className={selectedMenuId === menu.id ? "selected" : ""}
                      onClick={() => setSelectedMenuId(menu.id)}
                    >
                      <div>
                        <strong>{menu.name}</strong>
                        <span>{menu.description}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => startGame(selectedMenuId)}
                  disabled={menus.length === 0 || isRunning}
                >
                  시작하기
                </button>
              </div>
            </section>
            <section className="panel rank-panel">
              <div className="game-list-header">
                <h2>랭킹</h2>
                <button type="button" className="ghost" onClick={loadTopGames} disabled={topLoading}>
                  새로고침
                </button>
              </div>
              {topLoading && <p>불러오는 중...</p>}
              {topError && <p className="error">{topError}</p>}
              {!topLoading && !topError && topGames.length === 0 && (
                <p>기록이 없습니다.</p>
              )}
              {!topLoading && !topError && topGames.length > 0 && (
                <div className="game-cards">
                  {topGames.map((game, index) => (
                    <div key={game.id} className="game-card">
                      <div>
                        <strong>#{index + 1} {game.user_name || "사용자"}</strong>
                        <span>점수 {game.score ?? 0} · {formatDateTime(game.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="app kiosk">
      {renderHeader()}

      <main className="kiosk-layout">
        <div className="kiosk-center">
          <section className="kiosk-card order-box">
            <div className="order-box-header">
              <h2>현재 주문</h2>
              <span className="timer-pill">{formatTime(remainingSeconds)}</span>
            </div>
            {currentOrder ? (
              <div className="order-card">
                <ImageWithFallback
                  className="order-image"
                  src={currentOrder.selection?.item?.img}
                  alt={currentOrder.selection?.item?.name || "Order"}
                />
                <p className="order-category">{currentOrder.selection?.category}</p>
                <h3>{currentOrder.selection?.item?.name}</h3>
                <div className="topping-list">
                  {(currentOrder.selection?.topping || []).length ? (
                    currentOrder.selection.topping.map((topping, index) => (
                      <span key={`${topping.group}-${index}`}>
                        {topping.group}: {topping.item?.name}
                      </span>
                    ))
                  ) : (
                    <span>토핑 없음</span>
                  )}
                </div>
              </div>
            ) : (
              <p>게임을 시작하면 주문이 표시됩니다.</p>
            )}
            {gameStatus && <p className="status-text">{gameStatus}</p>}
          </section>

          <section className="kiosk-card category-box">
            <div className="section-row">
              <h3>카테고리</h3>
              <span className="muted">{isRunning ? "선택해서 맞혀보세요" : "미리 보기"}</span>
            </div>
            <div className="category-scroll">
              {categories.map((category) => (
                <button
                  key={category.kategorie}
                  type="button"
                  className={`chip-pill ${answerCategory === category.kategorie ? "selected" : ""}`}
                  onClick={() => setAnswerCategory(category.kategorie)}
                >
                  {category.kategorie}
                </button>
              ))}
            </div>
          </section>

          <section className="kiosk-card menu-box">
            <div className="section-row">
              <h3>메뉴</h3>
              <span className="muted">
                {selectedCategory ? selectedCategory.kategorie : "전체 메뉴"}
              </span>
            </div>
            <div className="menu-grid">
              {menuItems.map((item) => (
                <button
                  key={`${item.category}-${item.name}`}
                  type="button"
                  className={`menu-tile ${answerMenuName === item.name ? "selected" : ""}`}
                  onClick={() => {
                    setAnswerCategory(item.category);
                    setAnswerMenuName(item.name);
                  }}
                >
                  <ImageWithFallback className="menu-tile-image" src={item.img} alt={item.name} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <aside className="kiosk-aside">
          <div className="kiosk-card cart-box">
            <h3>지금 담은 메뉴</h3>
            {answerMenuName ? (
              <div className="cart-item">
                <strong>{answerMenuName}</strong>
                <span>{answerCategory || "카테고리 미선택"}</span>
                {selectedToppingNames.length > 0 && (
                  <div className="cart-toppings">
                    {selectedToppingNames.map((name) => (
                      <span key={name}>{name}</span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="muted">메뉴를 선택해 주세요.</p>
            )}

            {selectedCategory && selectedCategory.toping?.length > 0 && (
              <div className="cart-topping-selector">
                <p>토핑 선택</p>
                <div className="topping-groups">
                  {selectedCategory.toping.map((group) => (
                    <div key={group.name} className="topping-group">
                      <strong>{group.name}</strong>
                      <div className="chips">
                        {group.items.map((item) => {
                          const selected = answerToppings.has(item.name);
                          return (
                            <button
                              key={item.name}
                              type="button"
                              className={selected ? "selected" : ""}
                              onClick={() => {
                                setAnswerToppings((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.name)) {
                                    next.delete(item.name);
                                  } else {
                                    next.add(item.name);
                                  }
                                  return next;
                                });
                              }}
                            >
                              <span className="chip-content">
                                <ImageWithFallback className="chip-image" src={item.img} alt={item.name} />
                                {item.name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              className="primary"
              onClick={submitScore}
              disabled={!currentOrder || !isRunning}
            >
              채점 요청
            </button>
            <button className="primary pay" type="button">
              결제하기
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
