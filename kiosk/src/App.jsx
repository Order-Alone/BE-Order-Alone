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

  const resetAnswer = () => {
    setAnswerCategory("");
    setAnswerMenuName("");
    setAnswerToppings(new Set());
  };

  const startGame = async (menuId) => {
    if (!menuId) return;
    setGameStatus("");
    setFinalScore(null);
    resetAnswer();

    try {
      const response = await apiFetch("/game/start", {
        method: "POST",
        body: JSON.stringify({ menu_id: menuId }),
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
    setView("home");
  };

  useEffect(() => {
    if (isAuthed) {
      loadMenus();
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
        <header className="topbar">
          <div>
            <h1>ORDER ALONE</h1>
            <p>게임 결과</p>
          </div>
          <button className="ghost" onClick={() => setView("home")}>
            홈으로
          </button>
          <button className="ghost" onClick={logout}>
            로그아웃
          </button>
        </header>
        <main className="panel score-panel">
          <h2>최종 점수</h2>
          <p className="score">{finalScore ?? 0}점</p>
          <p className="status-text">수고했어요! 다시 도전할까요?</p>
          <button
            className="primary"
            onClick={() => {
              setView("home");
              setGameStatus("");
              setCurrentOrder(null);
              setGameId("");
              setRemainingSeconds(0);
              setFinalScore(null);
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
        <header className="topbar">
          <div>
            <h1>ORDER ALONE</h1>
            <p>메뉴를 고르고 게임을 시작하세요.</p>
          </div>
          <div className="status">
            <button className="ghost" onClick={logout}>
              로그아웃
            </button>
          </div>
        </header>

        <main className="grid">
          <section className="panel">
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
                disabled={!selectedMenuId || isRunning}
              >
                시작하기
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app kiosk">
      <header className="topbar">
        <div>
          <h1>ORDER ALONE</h1>
          <p>1분 챌린지 키오스크</p>
        </div>
        <div className="status">
          <div>
            <span>타이머</span>
            <strong>{formatTime(remainingSeconds)}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{isRunning ? "게임 중" : "대기"}</strong>
          </div>
          <button className="ghost" onClick={logout}>
            로그아웃
          </button>
        </div>
      </header>

      <main className="grid">
        <section className="panel order-panel">
          <div className="order-header">
            <h2>현재 주문</h2>
            {currentOrder && <span>Order #{currentOrder.id?.slice(-6)}</span>}
          </div>
          {currentOrder ? (
            <div className="order-card">
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

        <section className="panel selection-panel">
          <h2>정답 입력</h2>
          {!menuDetails ? (
            <p>메뉴를 선택해 주세요.</p>
          ) : (
            <>
              <div className="selector">
                <p>카테고리</p>
                <div className="chips">
                  {categories.map((category) => (
                    <button
                      key={category.kategorie}
                      type="button"
                      className={answerCategory === category.kategorie ? "selected" : ""}
                      onClick={() => setAnswerCategory(category.kategorie)}
                    >
                      {category.kategorie}
                    </button>
                  ))}
                </div>
              </div>

              {selectedCategory && (
                <div className="selector">
                  <p>메뉴</p>
                  <div className="chips">
                    {selectedCategory.menus.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className={answerMenuName === item.name ? "selected" : ""}
                        onClick={() => setAnswerMenuName(item.name)}
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedCategory && selectedCategory.toping?.length > 0 && (
                <div className="selector">
                  <p>토핑</p>
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
                                {item.name}
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
            </>
          )}
        </section>
      </main>
    </div>
  );
}
