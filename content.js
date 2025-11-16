// 調整さんページで全員が◯の日付を検出し、Googleカレンダーにエクスポートする機能

(function () {
  "use strict";

  // ページが読み込まれた後に実行
  function init() {
    // 既にボタンが追加されている場合はスキップ
    if (document.getElementById("chouseisan-calendar-export-container")) {
      return;
    }

    // イベント情報を取得
    const eventData = getEventData();
    if (!eventData) {
      return;
    }

    // 全員が◯の日付を検出（複数の方法を試す）
    const availableDates = findAvailableDates();

    if (availableDates.length === 0) {
      return;
    }

    // エクスポートボタンを追加
    addExportButton(eventData, availableDates);
  }

  // イベントデータを取得（DOMから直接取得）
  function getEventData() {
    try {
      // DOMから直接取得（イベント名など）
      const eventNameElement = document.querySelector(
        ".event-header__title h1, h1"
      );
      const eventName = eventNameElement
        ? eventNameElement.textContent.trim()
        : "調整さんイベント";

      return {
        name: eventName,
        choices: [],
      };
    } catch (e) {
      return null;
    }
  }

  // 全員が◯の日付を検出（DOMから直接検出）
  function findAvailableDates() {
    const availableDates = [];

    // DOMからfirst-rankクラスを検出
    const firstRankRows = document.querySelectorAll("tr.first-rank");

    if (firstRankRows.length > 0) {
      // テーブルのヘッダー行から日付情報を取得
      // 複数の方法でテーブルを探す
      let table = firstRankRows[0].closest("table");
      if (!table) {
        // tableタグが見つからない場合、親要素を探す
        let parent = firstRankRows[0].parentElement;
        let depth = 0;
        while (parent && depth < 10) {
          if (
            parent.tagName === "TABLE" ||
            parent.classList.contains("table") ||
            parent.querySelector("tr")
          ) {
            table =
              parent.tagName === "TABLE"
                ? parent
                : parent.querySelector("table") || parent;
            break;
          }
          parent = parent.parentElement;
          depth++;
        }
      }

      if (!table) {
        // ページ全体からテーブルを探す
        const allTables = document.querySelectorAll("table");
        if (allTables.length > 0) {
          // first-rank行を含むテーブルを探す
          for (const t of allTables) {
            if (t.contains(firstRankRows[0])) {
              table = t;
              break;
            }
          }
        }
      }

      if (!table) {
        // テーブルが見つからない場合でも、first-rank行の親要素から直接探す
        const parent = firstRankRows[0].parentElement;
        if (parent) {
          // 親要素内のすべての行を取得
          const allRows = parent.querySelectorAll("tr");

          // 最初の行をヘッダーとして使用
          if (allRows.length > 0) {
            const headerRow = allRows[0];
            processHeaderRow(headerRow, firstRankRows[0], availableDates);
          }
        }
      } else {
        // ヘッダー行を探す（複数の方法を試す）
        let headerRow = table.querySelector("thead tr");
        if (!headerRow) {
          // theadがない場合、最初の行を探す
          const allRows = table.querySelectorAll("tr");
          if (allRows.length > 0) {
            headerRow = allRows[0];
          }
        }

        if (headerRow) {
          processHeaderRow(headerRow, firstRankRows[0], availableDates);
        }
      }

      // ヘッダー行を処理する関数
      function processHeaderRow(headerRow, firstRankRow, availableDates) {
        // first-rankクラスの行の最初のセルから日付を取得
        // テーブル構造: 最初の列が日付、その後の列が参加者
        const firstRankRows = document.querySelectorAll("tr.first-rank");

        firstRankRows.forEach((row) => {
          const cells = Array.from(row.querySelectorAll("th, td"));
          if (cells.length === 0) return;

          // 最初のセルから日付を取得
          const firstCell = cells[0];
          let dateText = firstCell.textContent.trim();

          // 空の場合は、innerHTMLや他の方法で取得を試みる
          if (!dateText) {
            dateText = firstCell.innerText || firstCell.textContent || "";
            // 子要素がある場合は、それも確認
            const child = firstCell.querySelector("span, div, a, time");
            if (child) {
              dateText =
                child.textContent.trim() || child.innerText || dateText;
            }
          }

          // 日付らしいテキストかチェック（月/日 の形式）
          // より柔軟なパターン: "11/1" や "11/1(土)" や "11/17(月) 19:00〜" など
          const dateMatch = dateText.match(/(\d+)\/(\d+)/);
          if (dateMatch) {
            // 日付が見つかった場合、既に追加済みでないかチェック
            if (!availableDates.find((d) => d.text === dateText)) {
              const choiceIndex = findChoiceIndexByText(dateText);
              availableDates.push({
                text: dateText,
                index: choiceIndex,
              });
            }
          }
        });
      }
    }

    return availableDates;
  }

  // 日付テキストから選択肢のインデックスを取得（DOMからは取得できないため、-1を返す）
  function findChoiceIndexByText(dateText) {
    // DOMからは選択肢のインデックスを取得できないため、-1を返す
    return -1;
  }

  // 時刻文字列をパース（様々な形式に対応）
  function parseTime(timeStr) {
    if (!timeStr) return null;

    let hour = 0;
    let minute = 0;

    // "19時半" 形式
    if (timeStr.includes("時半")) {
      const match = timeStr.match(/(\d+)時半/);
      if (match) {
        hour = parseInt(match[1], 10);
        minute = 30;
        return { hour, minute };
      }
    }

    // "19時30" または "19時30分" 形式
    const match1 = timeStr.match(/(\d+)時(\d+)(?:分)?/);
    if (match1) {
      hour = parseInt(match1[1], 10);
      minute = parseInt(match1[2], 10);
      return { hour, minute };
    }

    // "19時" 形式
    const match2 = timeStr.match(/(\d+)時/);
    if (match2) {
      hour = parseInt(match2[1], 10);
      minute = 0;
      return { hour, minute };
    }

    // "19:30" 形式
    const match3 = timeStr.match(/(\d+):(\d+)/);
    if (match3) {
      hour = parseInt(match3[1], 10);
      minute = parseInt(match3[2], 10);
      return { hour, minute };
    }

    return null;
  }

  // 日付文字列をパースして開始時刻と終了時刻を取得
  function parseDate(dateText, eventData) {
    // 例: "11/1(土) 21時30〜" または "11/17(月) 19:00〜22:00" をパース
    const match = dateText.match(/(\d+)\/(\d+)/);
    if (!match) return null;

    const month = parseInt(match[1], 10);
    const day = parseInt(match[2], 10);

    // 時刻部分を抽出
    // "19:00〜22:00" または "19時〜22時" などの形式を探す
    let startTime = null;
    let endTime = null;

    // 終了時刻が含まれているかチェック（〜 または ～ で区切られている）
    // パターン1: "19:00〜22:00" 形式
    let timeRangeMatch = dateText.match(/(\d+:\d+)[〜～](\d+:\d+)/);
    if (timeRangeMatch) {
      startTime = parseTime(timeRangeMatch[1]);
      endTime = parseTime(timeRangeMatch[2]);
    } else {
      // パターン2: "19時30分〜22時30分" または "19時〜22時" 形式
      timeRangeMatch = dateText.match(
        /(\d+時(?:\d+分?|半)?)[〜～](\d+時(?:\d+分?|半)?)/
      );
      if (timeRangeMatch) {
        startTime = parseTime(timeRangeMatch[1]);
        endTime = parseTime(timeRangeMatch[2]);
      } else {
        // 開始時刻のみ
        // "19:30" 形式
        let timeMatch = dateText.match(/(\d+:\d+)/);
        if (timeMatch) {
          startTime = parseTime(timeMatch[1]);
        } else {
          // "19時30" または "19時" 形式
          timeMatch = dateText.match(/(\d+時(?:\d+分?|半)?)/);
          if (timeMatch) {
            startTime = parseTime(timeMatch[1]);
          }
        }
      }
    }

    // 現在の年を取得
    const now = new Date();
    const year = now.getFullYear();

    // 時刻が見つからない場合はデフォルト値を使用（日付のみの場合）
    if (!startTime) {
      startTime = { hour: 0, minute: 0 };
    }

    // 月が現在の月より前の場合は来年と判断
    let startDate = new Date(
      year,
      month - 1,
      day,
      startTime.hour,
      startTime.minute
    );
    if (startDate < now) {
      startDate = new Date(
        year + 1,
        month - 1,
        day,
        startTime.hour,
        startTime.minute
      );
    }

    let endDate = null;
    if (endTime) {
      endDate = new Date(year, month - 1, day, endTime.hour, endTime.minute);
      if (endDate < now) {
        endDate = new Date(
          year + 1,
          month - 1,
          day,
          endTime.hour,
          endTime.minute
        );
      }
      // 終了時刻が開始時刻より前の場合は翌日とする
      if (endDate <= startDate) {
        endDate = new Date(endDate.getTime() + 24 * 60 * 60 * 1000);
      }
    }

    // 開始時刻が元のテキストに含まれていたかチェック
    const hasStartTime =
      dateText.match(/(\d+:\d+|\d+時(?:\d+分?|半)?)/) !== null;

    return {
      start: startDate,
      end: endDate,
      hasEndTime: endTime !== null,
      hasStartTime: hasStartTime,
    };
  }

  // DateオブジェクトをGoogleカレンダー形式に変換
  function formatDateForGoogleCalendar(startDate, endDate) {
    // Googleカレンダー形式: YYYYMMDDTHHmmssZ (UTC)
    const format = (d) => {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const hours = String(d.getUTCHours()).padStart(2, "0");
      const minutes = String(d.getUTCMinutes()).padStart(2, "0");
      const seconds = String(d.getUTCSeconds()).padStart(2, "0");
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    };

    return {
      start: format(startDate),
      end: format(endDate),
    };
  }

  // GoogleカレンダーURLを生成
  function generateGoogleCalendarURL(
    eventName,
    startDate,
    endDate,
    details = ""
  ) {
    const formatted = formatDateForGoogleCalendar(startDate, endDate);
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: eventName,
      dates: `${formatted.start}/${formatted.end}`,
      details: details,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  // エクスポートボタンを追加
  function addExportButton(eventData, availableDates) {
    // コンテナを作成
    const container = document.createElement("div");
    container.id = "chouseisan-calendar-export-container";
    container.className = "chouseisan-calendar-export-container";

    // タイトル（クリック可能）
    const titleWrapper = document.createElement("div");
    titleWrapper.className = "chouseisan-export-title-wrapper";

    const title = document.createElement("h3");
    title.textContent = "Googleカレンダーにエクスポート";
    title.className = "chouseisan-export-title";

    const toggleIcon = document.createElement("span");
    toggleIcon.className = "chouseisan-toggle-icon";
    toggleIcon.textContent = "▶";

    titleWrapper.appendChild(toggleIcon);
    titleWrapper.appendChild(title);
    container.appendChild(titleWrapper);

    // コンテンツ部分（初期状態では非表示）
    const contentWrapper = document.createElement("div");
    contentWrapper.className = "chouseisan-export-content";
    contentWrapper.style.display = "none";

    // 説明
    const description = document.createElement("p");
    description.textContent = `全員が◯の日付: ${availableDates.length}件`;
    description.className = "chouseisan-export-description";
    contentWrapper.appendChild(description);

    // イベント名編集フィールド
    const eventNameContainer = document.createElement("div");
    eventNameContainer.className = "chouseisan-event-name-container";

    const eventNameLabel = document.createElement("label");
    eventNameLabel.textContent = "イベント名: ";
    eventNameLabel.className = "chouseisan-event-name-label";
    eventNameLabel.setAttribute("for", "chouseisan-event-name-input");

    const eventNameInput = document.createElement("input");
    eventNameInput.type = "text";
    eventNameInput.id = "chouseisan-event-name-input";
    eventNameInput.className = "chouseisan-event-name-input";
    eventNameInput.value = eventData.name;
    eventNameInput.placeholder = "イベント名を入力";

    eventNameContainer.appendChild(eventNameLabel);
    eventNameContainer.appendChild(eventNameInput);
    contentWrapper.appendChild(eventNameContainer);

    // 開始時刻のみの日付をチェック
    const datesWithoutEndTime = availableDates.filter((dateInfo) => {
      const parsedDate = parseDate(dateInfo.text, eventData);
      return parsedDate && !parsedDate.hasEndTime;
    });

    // 日付のみ（開始時刻も終了時刻もない）の日付をチェック
    const datesWithoutStartTime = availableDates.filter((dateInfo) => {
      const parsedDate = parseDate(dateInfo.text, eventData);
      return parsedDate && !parsedDate.hasStartTime;
    });

    // 一括設定セクションを追加
    let bulkStartHourSelect = null;
    let bulkStartMinuteSelect = null;
    let bulkDurationHourSelect = null;
    let bulkDurationMinuteSelect = null;
    let applyButton = null;

    if (datesWithoutStartTime.length > 0 || datesWithoutEndTime.length > 0) {
      const bulkSettingDiv = document.createElement("div");
      bulkSettingDiv.className = "chouseisan-bulk-setting";

      // 開始時刻がない日付がある場合、開始時刻の一括設定を追加
      if (datesWithoutStartTime.length > 0) {
        const bulkStartTimeContainer = document.createElement("div");
        bulkStartTimeContainer.className = "chouseisan-time-display";

        // 開始時刻の時間のプルダウン
        bulkStartHourSelect = document.createElement("select");
        bulkStartHourSelect.className =
          "chouseisan-duration-select chouseisan-start-hour-select chouseisan-bulk-select";
        bulkStartHourSelect.innerHTML = Array.from(
          { length: 24 },
          (_, i) =>
            `<option value="${i}" ${i === 19 ? "selected" : ""}>${i}</option>`
        ).join("");

        // 開始時刻の分のプルダウン
        bulkStartMinuteSelect = document.createElement("select");
        bulkStartMinuteSelect.className =
          "chouseisan-duration-select chouseisan-start-minute-select chouseisan-bulk-select";
        bulkStartMinuteSelect.innerHTML = `
          <option value="0" selected>0</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        `;

        bulkSettingDiv.appendChild(bulkStartTimeContainer);
      }

      // 開始時刻のみの日付がある場合、所要時間の一括設定を追加
      if (datesWithoutEndTime.length > 0) {
        const bulkDurationContainer = document.createElement("div");
        bulkDurationContainer.className = "chouseisan-time-display";

        // 時間のプルダウン
        bulkDurationHourSelect = document.createElement("select");
        bulkDurationHourSelect.className =
          "chouseisan-duration-select chouseisan-hour-select chouseisan-bulk-select";
        bulkDurationHourSelect.innerHTML = Array.from(
          { length: 24 },
          (_, i) =>
            `<option value="${i}" ${i === 1 ? "selected" : ""}>${i}</option>`
        ).join("");

        // 分のプルダウン
        bulkDurationMinuteSelect = document.createElement("select");
        bulkDurationMinuteSelect.className =
          "chouseisan-duration-select chouseisan-minute-select chouseisan-bulk-select";
        bulkDurationMinuteSelect.innerHTML = `
          <option value="0" selected>0</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        `;

        bulkSettingDiv.appendChild(bulkDurationContainer);
      }

      // 一括設定の表示を更新する関数
      if (datesWithoutStartTime.length > 0 && datesWithoutEndTime.length > 0) {
        const updateBulkDisplay = () => {
          const bulkStartTimeContainer = bulkSettingDiv.querySelector(
            ".chouseisan-time-display"
          );
          if (bulkStartTimeContainer) {
            bulkStartTimeContainer.innerHTML = "";

            // 開始時刻の時間
            const startHourWrapper = document.createElement("div");
            startHourWrapper.className = "chouseisan-select-wrapper";
            startHourWrapper.appendChild(bulkStartHourSelect);
            bulkStartTimeContainer.appendChild(startHourWrapper);
            const startHourText = document.createElement("span");
            startHourText.textContent = "時";
            bulkStartTimeContainer.appendChild(startHourText);

            // 開始時刻の分
            const startMinuteWrapper = document.createElement("div");
            startMinuteWrapper.className = "chouseisan-select-wrapper";
            startMinuteWrapper.appendChild(bulkStartMinuteSelect);
            bulkStartTimeContainer.appendChild(startMinuteWrapper);
            const startMinuteText = document.createElement("span");
            startMinuteText.textContent = "分";
            bulkStartTimeContainer.appendChild(startMinuteText);

            // から
            const fromText = document.createElement("span");
            fromText.textContent = "から";
            bulkStartTimeContainer.appendChild(fromText);

            // 所要時間の時間
            const hourWrapper = document.createElement("div");
            hourWrapper.className = "chouseisan-select-wrapper";
            hourWrapper.appendChild(bulkDurationHourSelect);
            bulkStartTimeContainer.appendChild(hourWrapper);
            const hourText = document.createElement("span");
            hourText.textContent = "時間";
            bulkStartTimeContainer.appendChild(hourText);

            // 所要時間の分
            const minuteWrapper = document.createElement("div");
            minuteWrapper.className = "chouseisan-select-wrapper";
            minuteWrapper.appendChild(bulkDurationMinuteSelect);
            bulkStartTimeContainer.appendChild(minuteWrapper);
            const minuteText = document.createElement("span");
            minuteText.textContent = "分";
            bulkStartTimeContainer.appendChild(minuteText);
          }
        };

        if (
          bulkStartHourSelect &&
          bulkStartMinuteSelect &&
          bulkDurationHourSelect &&
          bulkDurationMinuteSelect
        ) {
          updateBulkDisplay();
          bulkStartHourSelect.addEventListener("change", updateBulkDisplay);
          bulkStartMinuteSelect.addEventListener("change", updateBulkDisplay);
          bulkDurationHourSelect.addEventListener("change", updateBulkDisplay);
          bulkDurationMinuteSelect.addEventListener(
            "change",
            updateBulkDisplay
          );
        }
      } else if (datesWithoutStartTime.length > 0) {
        // 開始時刻のみの一括設定
        const updateBulkStartDisplay = () => {
          const bulkStartTimeContainer = bulkSettingDiv.querySelector(
            ".chouseisan-time-display"
          );
          if (bulkStartTimeContainer) {
            bulkStartTimeContainer.innerHTML = "";

            // 開始時刻の時間
            const startHourWrapper = document.createElement("div");
            startHourWrapper.className = "chouseisan-select-wrapper";
            startHourWrapper.appendChild(bulkStartHourSelect);
            bulkStartTimeContainer.appendChild(startHourWrapper);
            const startHourText = document.createElement("span");
            startHourText.textContent = "時";
            bulkStartTimeContainer.appendChild(startHourText);

            // 開始時刻の分
            const startMinuteWrapper = document.createElement("div");
            startMinuteWrapper.className = "chouseisan-select-wrapper";
            startMinuteWrapper.appendChild(bulkStartMinuteSelect);
            bulkStartTimeContainer.appendChild(startMinuteWrapper);
            const startMinuteText = document.createElement("span");
            startMinuteText.textContent = "分";
            bulkStartTimeContainer.appendChild(startMinuteText);

            // から
            const fromText = document.createElement("span");
            fromText.textContent = "から";
            bulkStartTimeContainer.appendChild(fromText);
          }
        };

        if (bulkStartHourSelect && bulkStartMinuteSelect) {
          updateBulkStartDisplay();
          bulkStartHourSelect.addEventListener(
            "change",
            updateBulkStartDisplay
          );
          bulkStartMinuteSelect.addEventListener(
            "change",
            updateBulkStartDisplay
          );
        }
      } else if (datesWithoutEndTime.length > 0) {
        // 所要時間のみの一括設定
        const updateBulkDurationDisplay = () => {
          const bulkDurationContainer = bulkSettingDiv.querySelector(
            ".chouseisan-time-display"
          );
          if (bulkDurationContainer) {
            bulkDurationContainer.innerHTML = "";

            // 所要時間の時間
            const hourWrapper = document.createElement("div");
            hourWrapper.className = "chouseisan-select-wrapper";
            hourWrapper.appendChild(bulkDurationHourSelect);
            bulkDurationContainer.appendChild(hourWrapper);
            const hourText = document.createElement("span");
            hourText.textContent = "時間";
            bulkDurationContainer.appendChild(hourText);

            // 所要時間の分
            const minuteWrapper = document.createElement("div");
            minuteWrapper.className = "chouseisan-select-wrapper";
            minuteWrapper.appendChild(bulkDurationMinuteSelect);
            bulkDurationContainer.appendChild(minuteWrapper);
            const minuteText = document.createElement("span");
            minuteText.textContent = "分";
            bulkDurationContainer.appendChild(minuteText);
          }
        };

        if (bulkDurationHourSelect && bulkDurationMinuteSelect) {
          updateBulkDurationDisplay();
          bulkDurationHourSelect.addEventListener(
            "change",
            updateBulkDurationDisplay
          );
          bulkDurationMinuteSelect.addEventListener(
            "change",
            updateBulkDurationDisplay
          );
        }
      }

      applyButton = document.createElement("button");
      applyButton.className = "chouseisan-apply-button";
      applyButton.textContent = "一括適用";

      bulkSettingDiv.appendChild(applyButton);
      contentWrapper.appendChild(bulkSettingDiv);
    }

    // ボタンコンテナ
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "chouseisan-button-container";

    // 各日付のエクスポートボタン
    availableDates.forEach((dateInfo, index) => {
      const parsedDate = parseDate(dateInfo.text, eventData);
      if (!parsedDate) return;

      // 日付アイテムのコンテナ
      const dateItem = document.createElement("div");
      dateItem.className = "chouseisan-date-item";

      // 日付のみ（開始時刻も終了時刻もない）の場合は、開始時刻と所要時間のプルダウンを表示
      if (!parsedDate.hasStartTime && !parsedDate.hasEndTime) {
        const label = document.createElement("label");
        label.textContent = `${dateInfo.text} `;
        label.className = "chouseisan-date-label";

        // 表示用のコンテナ
        const displayContainer = document.createElement("div");
        displayContainer.className = "chouseisan-time-display";
        displayContainer.style.marginRight = "10px";

        // 開始時刻の時間のプルダウン
        const startHourSelect = document.createElement("select");
        startHourSelect.className =
          "chouseisan-duration-select chouseisan-start-hour-select";
        startHourSelect.setAttribute("data-date-index", index);
        startHourSelect.innerHTML = Array.from(
          { length: 24 },
          (_, i) =>
            `<option value="${i}" ${i === 19 ? "selected" : ""}>${i}</option>`
        ).join("");

        // 開始時刻の分のプルダウン
        const startMinuteSelect = document.createElement("select");
        startMinuteSelect.className =
          "chouseisan-duration-select chouseisan-start-minute-select";
        startMinuteSelect.setAttribute("data-date-index", index);
        startMinuteSelect.innerHTML = `
          <option value="0" selected>0</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        `;

        // 所要時間の時間のプルダウン
        const hourSelect = document.createElement("select");
        hourSelect.className =
          "chouseisan-duration-select chouseisan-hour-select";
        hourSelect.setAttribute("data-date-index", index);
        hourSelect.innerHTML = Array.from(
          { length: 24 },
          (_, i) =>
            `<option value="${i}" ${i === 1 ? "selected" : ""}>${i}</option>`
        ).join("");

        // 所要時間の分のプルダウン
        const minuteSelect = document.createElement("select");
        minuteSelect.className =
          "chouseisan-duration-select chouseisan-minute-select";
        minuteSelect.setAttribute("data-date-index", index);
        minuteSelect.innerHTML = `
          <option value="0" selected>0</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        `;

        // 表示を更新する関数
        const updateDisplay = () => {
          displayContainer.innerHTML = "";

          // 開始時刻の時間
          const startHourWrapper = document.createElement("div");
          startHourWrapper.className = "chouseisan-select-wrapper";
          startHourWrapper.appendChild(startHourSelect);
          displayContainer.appendChild(startHourWrapper);
          const startHourText = document.createElement("span");
          startHourText.textContent = "時";
          displayContainer.appendChild(startHourText);

          // 開始時刻の分
          const startMinuteWrapper = document.createElement("div");
          startMinuteWrapper.className = "chouseisan-select-wrapper";
          startMinuteWrapper.appendChild(startMinuteSelect);
          displayContainer.appendChild(startMinuteWrapper);
          const startMinuteText = document.createElement("span");
          startMinuteText.textContent = "分";
          displayContainer.appendChild(startMinuteText);

          // から
          const fromText = document.createElement("span");
          fromText.textContent = "から";
          displayContainer.appendChild(fromText);

          // 所要時間の時間
          const hourWrapper = document.createElement("div");
          hourWrapper.className = "chouseisan-select-wrapper";
          hourWrapper.appendChild(hourSelect);
          displayContainer.appendChild(hourWrapper);
          const hourText = document.createElement("span");
          hourText.textContent = "時間";
          displayContainer.appendChild(hourText);

          // 所要時間の分
          const minuteWrapper = document.createElement("div");
          minuteWrapper.className = "chouseisan-select-wrapper";
          minuteWrapper.appendChild(minuteSelect);
          displayContainer.appendChild(minuteWrapper);
          const minuteText = document.createElement("span");
          minuteText.textContent = "分";
          displayContainer.appendChild(minuteText);
        };

        // 初期表示
        updateDisplay();

        // プルダウンの変更時に表示を更新
        startHourSelect.addEventListener("change", updateDisplay);
        startMinuteSelect.addEventListener("change", updateDisplay);
        hourSelect.addEventListener("change", updateDisplay);
        minuteSelect.addEventListener("change", updateDisplay);

        const button = document.createElement("button");
        button.className = "chouseisan-export-button";
        button.textContent = "エクスポート";

        button.addEventListener("click", () => {
          const startHours = parseInt(startHourSelect.value, 10) || 0;
          const startMinutes = parseInt(startMinuteSelect.value, 10) || 0;
          const durationHours = parseInt(hourSelect.value, 10) || 0;
          const durationMinutes = parseInt(minuteSelect.value, 10) || 0;
          const totalDurationMinutes = durationHours * 60 + durationMinutes;

          if (totalDurationMinutes === 0) {
            alert("所要時間を設定してください");
            return;
          }

          const eventName = eventNameInput.value.trim() || eventData.name;
          const startDate = new Date(parsedDate.start);
          startDate.setHours(startHours, startMinutes, 0, 0);
          const endDate = new Date(
            startDate.getTime() + totalDurationMinutes * 60 * 1000
          );
          const url = generateGoogleCalendarURL(
            eventName,
            startDate,
            endDate,
            `調整さん: ${eventData.name}\n日付: ${dateInfo.text}`
          );
          window.open(url, "_blank");
        });

        dateItem.appendChild(label);
        dateItem.appendChild(displayContainer);
        dateItem.appendChild(button);
      } else if (!parsedDate.hasEndTime) {
        // 開始時刻のみの場合は、所要時間のプルダウンを表示
        const label = document.createElement("label");
        label.textContent = `${dateInfo.text} `;
        label.className = "chouseisan-date-label";

        const durationContainer = document.createElement("div");
        durationContainer.className = "chouseisan-time-display";

        // 時間のプルダウン
        const hourSelect = document.createElement("select");
        hourSelect.className =
          "chouseisan-duration-select chouseisan-hour-select";
        hourSelect.setAttribute("data-date-index", index);
        hourSelect.innerHTML = Array.from(
          { length: 24 },
          (_, i) =>
            `<option value="${i}" ${i === 1 ? "selected" : ""}>${i}</option>`
        ).join("");

        // 分のプルダウン
        const minuteSelect = document.createElement("select");
        minuteSelect.className =
          "chouseisan-duration-select chouseisan-minute-select";
        minuteSelect.setAttribute("data-date-index", index);
        minuteSelect.innerHTML = `
          <option value="0" selected>0</option>
          <option value="15">15</option>
          <option value="30">30</option>
          <option value="45">45</option>
        `;

        // 表示を更新する関数
        const updateDisplay = () => {
          durationContainer.innerHTML = "";

          // 所要時間の時間
          const hourWrapper = document.createElement("div");
          hourWrapper.className = "chouseisan-select-wrapper";
          hourWrapper.appendChild(hourSelect);
          durationContainer.appendChild(hourWrapper);
          const hourText = document.createElement("span");
          hourText.textContent = "時間";
          durationContainer.appendChild(hourText);

          // 所要時間の分
          const minuteWrapper = document.createElement("div");
          minuteWrapper.className = "chouseisan-select-wrapper";
          minuteWrapper.appendChild(minuteSelect);
          durationContainer.appendChild(minuteWrapper);
          const minuteText = document.createElement("span");
          minuteText.textContent = "分";
          durationContainer.appendChild(minuteText);
        };

        // 初期表示
        updateDisplay();

        // プルダウンの変更時に表示を更新
        hourSelect.addEventListener("change", updateDisplay);
        minuteSelect.addEventListener("change", updateDisplay);

        const button = document.createElement("button");
        button.className = "chouseisan-export-button";
        button.textContent = "エクスポート";

        button.addEventListener("click", () => {
          const hours = parseInt(hourSelect.value, 10) || 0;
          const minutes = parseInt(minuteSelect.value, 10) || 0;
          const durationMinutes = hours * 60 + minutes;

          if (durationMinutes === 0) {
            alert("所要時間を設定してください");
            return;
          }

          const eventName = eventNameInput.value.trim() || eventData.name;
          const endDate = new Date(
            parsedDate.start.getTime() + durationMinutes * 60 * 1000
          );
          const url = generateGoogleCalendarURL(
            eventName,
            parsedDate.start,
            endDate,
            `調整さん: ${eventData.name}\n日付: ${dateInfo.text}`
          );
          window.open(url, "_blank");
        });

        dateItem.appendChild(label);
        dateItem.appendChild(durationContainer);
        dateItem.appendChild(button);
      } else {
        // 終了時刻が含まれている場合は通常のボタン
        const button = document.createElement("button");
        button.className = "chouseisan-export-button";
        button.textContent = `${dateInfo.text} をエクスポート`;

        button.addEventListener("click", () => {
          const eventName = eventNameInput.value.trim() || eventData.name;
          const url = generateGoogleCalendarURL(
            eventName,
            parsedDate.start,
            parsedDate.end,
            `調整さん: ${eventData.name}\n日付: ${dateInfo.text}`
          );
          window.open(url, "_blank");
        });

        dateItem.appendChild(button);
      }

      buttonContainer.appendChild(dateItem);
    });

    // 一括適用ボタンのイベントリスナー
    if (applyButton) {
      applyButton.addEventListener("click", () => {
        // 開始時刻の一括適用
        if (bulkStartHourSelect && bulkStartMinuteSelect) {
          const selectedStartHour =
            parseInt(bulkStartHourSelect.value, 10) || 0;
          const selectedStartMinute =
            parseInt(bulkStartMinuteSelect.value, 10) || 0;

          const allStartHourSelects = contentWrapper.querySelectorAll(
            ".chouseisan-start-hour-select:not(.chouseisan-bulk-select)"
          );
          const allStartMinuteSelects = contentWrapper.querySelectorAll(
            ".chouseisan-start-minute-select:not(.chouseisan-bulk-select)"
          );

          allStartHourSelects.forEach((select) => {
            select.value = selectedStartHour;
          });

          allStartMinuteSelects.forEach((select) => {
            select.value = selectedStartMinute;
          });
        }

        // 所要時間の一括適用
        if (bulkDurationHourSelect && bulkDurationMinuteSelect) {
          const selectedDurationHour =
            parseInt(bulkDurationHourSelect.value, 10) || 0;
          const selectedDurationMinute =
            parseInt(bulkDurationMinuteSelect.value, 10) || 0;

          const allDurationHourSelects = contentWrapper.querySelectorAll(
            ".chouseisan-hour-select:not(.chouseisan-bulk-select):not(.chouseisan-start-hour-select)"
          );
          const allDurationMinuteSelects = contentWrapper.querySelectorAll(
            ".chouseisan-minute-select:not(.chouseisan-bulk-select):not(.chouseisan-start-minute-select)"
          );

          allDurationHourSelects.forEach((select) => {
            select.value = selectedDurationHour;
          });

          allDurationMinuteSelects.forEach((select) => {
            select.value = selectedDurationMinute;
          });
        }
      });
    }

    // すべてを一度にエクスポートするボタン
    const exportAllButton = document.createElement("button");
    exportAllButton.className = "chouseisan-export-all-button";
    exportAllButton.textContent = "一括エクスポート";

    exportAllButton.addEventListener("click", () => {
      const eventName = eventNameInput.value.trim() || eventData.name;

      availableDates.forEach((dateInfo, index) => {
        const parsedDate = parseDate(dateInfo.text, eventData);
        if (!parsedDate) return;

        let startDate = parsedDate.start;
        let endDate;

        if (parsedDate.end) {
          // 終了時刻が含まれている場合
          endDate = parsedDate.end;
        } else {
          // 開始時刻がない場合、対応するプルダウンから開始時刻を取得
          const dateItem = buttonContainer.children[index];
          if (dateItem) {
            const startHourSelect = dateItem.querySelector(
              ".chouseisan-start-hour-select"
            );
            const startMinuteSelect = dateItem.querySelector(
              ".chouseisan-start-minute-select"
            );

            if (startHourSelect && startMinuteSelect) {
              const startHours = parseInt(startHourSelect.value, 10) || 0;
              const startMinutes = parseInt(startMinuteSelect.value, 10) || 0;
              startDate = new Date(parsedDate.start);
              startDate.setHours(startHours, startMinutes, 0, 0);
            }

            // 所要時間を取得
            const hourSelect = dateItem.querySelector(
              ".chouseisan-hour-select:not(.chouseisan-start-hour-select)"
            );
            const minuteSelect = dateItem.querySelector(
              ".chouseisan-minute-select:not(.chouseisan-start-minute-select)"
            );

            let durationMinutes = 60; // デフォルト
            if (hourSelect && minuteSelect) {
              const hours = parseInt(hourSelect.value, 10) || 0;
              const minutes = parseInt(minuteSelect.value, 10) || 0;
              durationMinutes = hours * 60 + minutes;
              if (durationMinutes === 0) {
                durationMinutes = 60; // 0の場合はデフォルトで1時間
              }
            }
            endDate = new Date(
              startDate.getTime() + durationMinutes * 60 * 1000
            );
          } else {
            // フォールバック: デフォルトで1時間
            endDate = new Date(parsedDate.start.getTime() + 60 * 60 * 1000);
          }
        }

        const url = generateGoogleCalendarURL(
          eventName,
          startDate,
          endDate,
          `調整さん: ${eventData.name}\n日付: ${dateInfo.text}`
        );

        // 少し遅延を入れて複数のタブを開く
        setTimeout(() => {
          window.open(url, "_blank");
        }, index * 300);
      });
    });

    buttonContainer.appendChild(exportAllButton);
    contentWrapper.appendChild(buttonContainer);

    // コンテンツ部分をコンテナに追加
    container.appendChild(contentWrapper);

    // 折りたたみ機能
    let isExpanded = false;
    titleWrapper.addEventListener("click", () => {
      isExpanded = !isExpanded;
      if (isExpanded) {
        contentWrapper.style.display = "block";
        toggleIcon.textContent = "▼";
        titleWrapper.classList.add("expanded");
      } else {
        contentWrapper.style.display = "none";
        toggleIcon.textContent = "▶";
        titleWrapper.classList.remove("expanded");
      }
    });

    // ページに挿入（イベントヘッダーの下に配置）
    const eventHeader = document.querySelector(".event-header");
    if (eventHeader && eventHeader.parentElement) {
      eventHeader.parentElement.insertBefore(
        container,
        eventHeader.nextSibling
      );
    } else {
      // フォールバック: コンテンツエリアの最初に配置
      const content = document.querySelector(".content, .section-wrapper");
      if (content) {
        content.insertBefore(container, content.firstChild);
      }
    }
  }

  // ページ読み込み完了後に実行
  function startInit() {
    // window.Chouseisanを待たずに、すぐにDOMから検出を試みる
    init();
  }

  // ページの読み込み状態に応じて実行
  if (document.readyState === "loading") {
    // まだ読み込み中の場合
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(startInit, 500);
    });

    // window.loadイベントも待つ
    window.addEventListener("load", () => {
      setTimeout(startInit, 500);
    });
  } else if (document.readyState === "interactive") {
    // インタラクティブな状態
    setTimeout(startInit, 500);
  } else {
    // 完全に読み込み済み
    setTimeout(startInit, 500);
  }

  // MutationObserverで動的な変更を監視
  let lastCheck = Date.now();
  const observer = new MutationObserver((mutations) => {
    // first-rankクラスが追加された場合に再実行
    // ただし、頻繁にチェックしすぎないように制限（1秒に1回まで）
    const now = Date.now();
    if (now - lastCheck > 1000) {
      lastCheck = now;

      const hasFirstRank = document.querySelector("tr.first-rank");
      if (
        hasFirstRank &&
        !document.getElementById("chouseisan-calendar-export-container")
      ) {
        setTimeout(init, 500);
      }
    }
  });

  // bodyが存在する場合は監視を開始
  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  } else {
    // bodyがまだ存在しない場合は、bodyが追加されるまで待つ
    const bodyObserver = new MutationObserver((mutations, obs) => {
      if (document.body) {
        obs.disconnect();
        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    });
    bodyObserver.observe(document.documentElement, {
      childList: true,
    });
  }
})();
