import React, { ChangeEvent, useEffect, useState } from "react";
import { render } from "react-dom";
import "./styles.scss";

import { User, UserNode } from "./model/user";
import { Toast } from "./components/Toast";
import { UserCheckIcon } from "./components/icons/UserCheckIcon";
import { UserUncheckIcon } from "./components/icons/UserUncheckIcon";
import { DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
  DEFAULT_TIME_BETWEEN_UNFOLLOWS,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
  DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS, INSTAGRAM_HOSTNAME } from "./constants/constants";
import {
  assertUnreachable,
  getCookie,
  getCurrentPageUnfollowers,
  getUsersForDisplay, sleep, unfollowUserUrlGenerator, urlGenerator,
} from "./utils/utils";
import { NotSearching } from "./components/NotSearching";
import { State } from "./model/state";
import { Searching } from "./components/Searching";
import { Toolbar } from "./components/Toolbar";
import { Unfollowing } from "./components/Unfollowing";
import { Timings } from "./model/timings";
import { loadWhitelist, saveWhitelist, loadTimings, saveTimings } from "./utils/whitelist-manager";

/**
 * Aplikasi ini dijalankan dengan cara di-paste ke Console saat kamu sedang membuka `www.instagram.com`.
 *
 * Kenapa bisa bekerja?
 * - Kode ini dieksekusi di konteks halaman Instagram (origin yang sama).
 * - Saat kita melakukan `fetch(...)` ke `instagram.com`, cookie login kamu ikut terkirim otomatis (karena `credentials: "include"`).
 *
 * Catatan keamanan:
 * - Jangan pernah paste script dari sumber yang tidak kamu percaya, karena script di console punya akses ke sesi akunmu.
 */

// Flag global untuk pause/resume proses scan tanpa mematikan UI.
let scanningPaused = false;

function pauseScan() {
  scanningPaused = !scanningPaused;
}


function App() {
  // State utama aplikasi (mode awal / scanning / berhenti mengikuti) + semua data yang tampil di UI.
  const [state, setState] = useState<State>({
    status: "initial",
  });

  // Toast adalah notifikasi kecil di pojok layar (mis. saat aplikasi menunggu/delay).
  const [toast, setToast] = useState<{ readonly show: false } | { readonly show: true; readonly text: string }>({
    show: false,
  });

  // `timings` mengatur delay agar perilaku lebih "manusiawi" dan mengurangi risiko action-block dari Instagram.
  // Nilai disimpan di localStorage agar tidak hilang saat reload.
  const [timings, setTimings] = useState<Timings>(() => {
    const storedTimings = loadTimings();
    return storedTimings ?? {
      timeBetweenSearchCycles: DEFAULT_TIME_BETWEEN_SEARCH_CYCLES,
      timeToWaitAfterFiveSearchCycles: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_SEARCH_CYCLES,
      timeBetweenUnfollows: DEFAULT_TIME_BETWEEN_UNFOLLOWS,
      timeToWaitAfterFiveUnfollows: DEFAULT_TIME_TO_WAIT_AFTER_FIVE_UNFOLLOWS,
    };
  });

  // Simpan timings setiap kali berubah.
  useEffect(() => {
    saveTimings(timings);
  }, [timings]);


  // Dipakai untuk menampilkan progress bar dan mencegah reset state saat proses masih berjalan.
  let isActiveProcess: boolean;
  switch (state.status) {
    case "initial":
      isActiveProcess = false;
      break;
    case "scanning":
    case "unfollowing":
      isActiveProcess = state.percentage < 100;
      break;
    default:
      assertUnreachable(state);
  }

  const onScan = async () => {
    if (state.status !== "initial") {
      return;
    }
    // Muat whitelist dari localStorage agar user yang di-whitelist tidak ikut dihapus-follow (berhenti diikuti).
    const whitelistedResults = loadWhitelist();
    setState({
      status: "scanning",
      page: 1,
      searchTerm: "",
      currentTab: "non_whitelisted",
      percentage: 0,
      results: [],
      selectedResults: [],
      whitelistedResults,
      filter: {
        showNonFollowers: true,
        showFollowers: false,
        showVerified: true,
        showPrivate: true,
        showWithOutProfilePicture: true,
      },
    });
  };

  const handleScanFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (state.selectedResults.length > 0) {
      if (!confirm("Mengubah filter akan mengosongkan pilihan user. Lanjut?")) {
        // Paksa re-render. Ini sedikit "hacky", tapi pernah ada kasus checkbox di UI berubah
        // walau user membatalkan confirm. Dengan setState ulang, kita sinkronkan UI dengan state.
        setState({ ...state });
        return;
      }
    }
    setState({
      ...state,
      // Saat filter berubah, pilihan user harus dihapus agar tidak ada user yang "terpilih" tapi tidak terlihat di UI.
      selectedResults: [],
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const handleUnfollowFilter = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "unfollowing") {
      return;
    }
    setState({
      ...state,
      filter: {
        ...state.filter,
        [e.currentTarget.name]: e.currentTarget.checked,
      },
    });
  };

  const toggleUser = (newStatus: boolean, user: UserNode) => {
    if (state.status !== "scanning") {
      return;
    }
    if (newStatus) {
      setState({
        ...state,
        selectedResults: [...state.selectedResults, user],
      });
    } else {
      setState({
        ...state,
        selectedResults: state.selectedResults.filter(result => result.id !== user.id),
      });
    }
  };

  const toggleAllUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    // Pilih semua user yang sedang tampil (sesuai tab + searchTerm + filter).
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getUsersForDisplay(
          state.results,
          state.whitelistedResults,
          state.currentTab,
          state.searchTerm,
          state.filter,
        ),
      });
    } else {
      setState({
        ...state,
        selectedResults: [],
      });
    }
  };

  // Mirip toggleAllUsers, tapi hanya memilih user pada halaman (pagination) yang sedang dibuka.
  const toggleCurrentePageUsers = (e: ChangeEvent<HTMLInputElement>) => {
    if (state.status !== "scanning") {
      return;
    }
    if (e.currentTarget.checked) {
      setState({
        ...state,
        selectedResults: getCurrentPageUnfollowers(
          getUsersForDisplay(
            state.results,
            state.whitelistedResults,
            state.currentTab,
            state.searchTerm,
            state.filter,
          ),
          state.page,
        ),
      });
    } else {
      setState({
        ...state,
        selectedResults: [],
      });
    }
  };

  const onWhitelistUpdate = (updatedWhitelist: readonly UserNode[]) => {
    // Simpan whitelist ke localStorage dan update state agar UI langsung ikut berubah.
    saveWhitelist(updatedWhitelist);
    if (state.status === "scanning") {
      setState({
        ...state,
        whitelistedResults: updatedWhitelist,
      });
    }
  };

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Tampilkan prompt jika user mencoba menutup tab saat proses masih berjalan (scan / berhenti mengikuti).
      // Ini mencegah tab tertutup tidak sengaja dan progres hilang.
      if (!isActiveProcess) {
        return;
      }

      // `e` bisa saja undefined di browser lama, jadi kita abaikan peringatan linter untuk bagian ini.
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      e = e || window.event;

      // `e` bisa saja undefined di browser lama, jadi kita abaikan peringatan linter untuk bagian ini.
      // Untuk IE dan Firefox versi lama (sebelum v4)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (e) {
        e.returnValue = "Perubahan yang kamu buat mungkin tidak tersimpan.";
      }

      // Untuk Safari
      return "Perubahan yang kamu buat mungkin tidak tersimpan.";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isActiveProcess, state]);

  useEffect(() => {
    // Proses scanning: mengambil daftar akun yang kamu follow dari endpoint GraphQL Instagram.
    const scan = async () => {
      if (state.status !== "scanning") {
        return;
      }
      const results = [...state.results];
      let scrollCycle = 0;
      let url = urlGenerator();
      let hasNext = true;
      let currentFollowedUsersCount = 0;
      let totalFollowedUsersCount = -1;

      while (hasNext) {
        let receivedData: User;
        try {
          receivedData = (await fetch(url).then(res => res.json())).data.user.edge_follow;
        } catch (e) {
          console.error(e);
          continue;
        }

        if (totalFollowedUsersCount === -1) {
          totalFollowedUsersCount = receivedData.count;
        }

        hasNext = receivedData.page_info.has_next_page;
        url = urlGenerator(receivedData.page_info.end_cursor);
        currentFollowedUsersCount += receivedData.edges.length;
        receivedData.edges.forEach(x => results.push(x.node));

        setState(prevState => {
          if (prevState.status !== "scanning") {
            return prevState;
          }
          const newState: State = {
            ...prevState,
            // Pakai Math.round agar progress bisa benar-benar mencapai 100%.
            percentage: Math.round((currentFollowedUsersCount / totalFollowedUsersCount) * 100),
            results,
          };
          return newState;
        });

        // Pause scanning jika user menekan tombol pause.
        while (scanningPaused) {
          await sleep(1000);
          console.info("Scan dijeda");
        }

        // Micro-pause acak agar lebih mirip perilaku manusia.
        const microPause = Math.floor(Math.random() * 1500) + 500; // 500ms - 2000ms
        await sleep(microPause);

        // Delay standar antar siklus fetch (diacak sedikit).
        await sleep(Math.floor(Math.random() * (timings.timeBetweenSearchCycles - timings.timeBetweenSearchCycles * 0.7)) + timings.timeBetweenSearchCycles);
        
        scrollCycle++;
        if (scrollCycle > 6) {
          scrollCycle = 0;
          // Sesekali tidur lebih lama agar tidak membentuk pola request yang terlalu konsisten.
          const longSleepVar = Math.max(
            0,
            timings.timeToWaitAfterFiveSearchCycles + (Math.random() * 10000 - 5000), // +/- 5 detik
          );
          setToast({ show: true, text: `Tidur ${Math.round(longSleepVar / 1000)} detik supaya tidak kena blokir sementara` });
          await sleep(longSleepVar);
        }
        setToast({ show: false });
      }
      setToast({ show: true, text: "Pemindaian selesai!" });
    };
    scan();
    // Dependency array belum ideal, tapi saat ini cukup berfungsi. TODO: Cari cara yang lebih rapi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  useEffect(() => {
    // Proses berhenti mengikuti: mengirim request POST ke endpoint unfollow Instagram untuk setiap user yang dipilih.
    const unfollow = async () => {
      if (state.status !== "unfollowing") {
        return;
      }

      // Instagram memakai CSRF token (dari cookie `csrftoken`) untuk memvalidasi request POST.
      const csrftoken = getCookie("csrftoken");
      if (csrftoken === null) {
        throw new Error("Cookie csrftoken kosong (null)");
      }

      // Rate limit: target maksimal 12 aksi berhenti mengikuti per window (default window = 5 menit).
      const UNFOLLOWS_PER_WINDOW = 12;
      const windowMs = timings.timeToWaitAfterFiveUnfollows;
      const minDelayBetweenUnfollowsMs = Math.ceil(windowMs / UNFOLLOWS_PER_WINDOW);

      let counter = 0;
      for (const user of state.selectedResults) {
        counter += 1;
        // Pakai Math.round agar progress bisa benar-benar mencapai 100%.
        const percentage = Math.round((counter / state.selectedResults.length) * 100);
        try {
          await fetch(unfollowUserUrlGenerator(user.id), {
            headers: {
              "content-type": "application/x-www-form-urlencoded",
              "x-csrftoken": csrftoken,
            },
            method: "POST",
            mode: "cors",
            credentials: "include",
          });
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: true,
                },
              ],
            };
          });
        } catch (e) {
          console.error(e);
          setState(prevState => {
            if (prevState.status !== "unfollowing") {
              return prevState;
            }
            return {
              ...prevState,
              percentage,
              unfollowLog: [
                ...prevState.unfollowLog,
                {
                  user,
                  unfollowedSuccessfully: false,
                },
              ],
            };
          });
        }
        // Jika ini user terakhir, tidak perlu delay lagi.
        if (user === state.selectedResults[state.selectedResults.length - 1]) {
          break;
        }

        // Rate limit: jaga agar rata-rata tidak lebih cepat dari `UNFOLLOWS_PER_WINDOW` per `windowMs`.
        // Ditambah jitter acak agar tidak terlihat seperti bot.
        const baseDelayMs = Math.max(timings.timeBetweenUnfollows, minDelayBetweenUnfollowsMs);
        const delayMs = Math.floor(Math.random() * (baseDelayMs * 0.2)) + baseDelayMs; // +0-20% variasi acak
        setToast({ show: true, text: `Menunggu ${Math.round(delayMs / 1000)} detik (${UNFOLLOWS_PER_WINDOW} aksi / ${Math.round(windowMs / 60000)} menit)` });
        await sleep(delayMs);
        setToast({ show: false });
      }
    };
    unfollow();
    // Dependency array belum ideal, tapi saat ini cukup berfungsi. TODO: Cari cara yang lebih rapi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  let markup: React.JSX.Element;
  switch (state.status) {
    case "initial":
      markup = <NotSearching onScan={onScan}></NotSearching>;
      break;

    case "scanning": {
      markup = <Searching
        state={state}
        handleScanFilter={handleScanFilter}
        toggleUser={toggleUser}
        pauseScan={pauseScan}
        setState={setState}
        scanningPaused={scanningPaused}
        UserCheckIcon={UserCheckIcon}
        UserUncheckIcon={UserUncheckIcon}
      ></Searching>;
      break;
    }

    case "unfollowing":
      markup = <Unfollowing
        state={state}
        handleUnfollowFilter={handleUnfollowFilter}
      ></Unfollowing>;
      break;

    default:
      assertUnreachable(state);
  }

  return (
    <main id="main" role="main" className="iu">
      <section className="overlay">
        <Toolbar
          state={state}
          setState={setState}
          isActiveProcess={isActiveProcess}
          toggleAllUsers={toggleAllUsers}
          toggleCurrentePageUsers={toggleCurrentePageUsers}
          setTimings={setTimings}
          currentTimings={timings}
          whitelistedUsers={state.status === "scanning" ? state.whitelistedResults : loadWhitelist()}
          onWhitelistUpdate={onWhitelistUpdate}
        ></Toolbar>

        {markup}

        {toast.show && <Toast show={toast.show} message={toast.text} onClose={() => setToast({ show: false })} />}
      </section>
    </main>
  );
}

if (location.hostname !== INSTAGRAM_HOSTNAME) {
  alert("Script ini hanya bisa digunakan di website Instagram (www.instagram.com).");
} else {
  document.title = "InstagramUnfollowers";
  // Kosongkan halaman Instagram dan render UI tool ini.
  document.body.innerHTML = "";
  render(<App />, document.body);
}
