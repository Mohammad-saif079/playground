import { useEffect, useRef, useState } from "react";
import {
    executeSQL,
    initDatabase,
} from "../database/sqlite";

function formatTable(rows) {
    if (!rows || rows.length === 0) {
        return "Empty set";
    }

    const columns = Object.keys(rows[0]);

    const data = rows.map((row) =>
        columns.map((column) => {
            const value = row[column];

            if (value === null || value === undefined) {
                return "NULL";
            }

            return String(value);
        })
    );

    const widths = columns.map((column, index) => {
        const values = data.map((row) => row[index]);

        return Math.max(
            column.length,
            ...values.map((value) => value.length)
        );
    });

    const separator =
        "+" +
        widths
            .map((width) => "-".repeat(width + 2))
            .join("+") +
        "+";

    const formatRow = (values) => {
        return (
            "|" +
            values
                .map(
                    (value, index) =>
                        ` ${value.padEnd(widths[index])} `
                )
                .join("|") +
            "|"
        );
    };

    const output = [];

    output.push(separator);
    output.push(formatRow(columns));
    output.push(separator);

    for (const row of data) {
        output.push(formatRow(row));
    }

    output.push(separator);

    output.push(
        `${rows.length} ${rows.length === 1 ? "row" : "rows"
        } in set`
    );

    return output.join("\n");
}

function escapeHTML(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function highlightSQL(sql) {
    const escaped = escapeHTML(sql);

    const tokenRegex =
        /(--[^\n]*|'(?:''|[^'])*'|"(?:[""]|[^"])*"|\b\d+(?:\.\d+)?\b|\b(?:SELECT|FROM|WHERE|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|INDEX|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|ON|AS|AND|OR|NOT|NULL|IS|LIKE|IN|BETWEEN|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|DISTINCT|UNION|ALL|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|DEFAULT|UNIQUE|CHECK|AUTOINCREMENT|COUNT|SHOW|SUM|AVG|MIN|MAX)\b)/gi;

    return escaped.replace(tokenRegex, (token) => {

        // Comments
        if (token.startsWith("--")) {
            return `<span class="sql-comment">${token}</span>`;
        }

        // Strings
        if (
            token.startsWith("'") ||
            token.startsWith('"')
        ) {
            return `<span class="sql-string">${token}</span>`;
        }

        // Numbers
        if (/^\d/.test(token)) {
            return `<span class="sql-number">${token}</span>`;
        }

        // SQL keywords
        return `<span class="sql-keyword">${token}</span>`;
    });
}


function Terminal() {
    const [input, setInput] = useState("");
    const [output, setOutput] = useState([
        {
            type: "comment",
            text: `# SQL Playground
# Built with ❤ by Saif
# Found a bug? Report it on Instagram
# @saif_00749
`,
        },
    ]);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [ready, setReady] = useState(false);

    const terminalRef = useRef(null);
    const inputRef = useRef(null);

    // --------------------------------
    // INITIALIZE DATABASE
    // --------------------------------

    useEffect(() => {
        const start = () => {
            initDatabase()
                .then(() => setReady(true))
                .catch((error) => {
                    setOutput([
                        {
                            type: "error",
                            text: `ERROR: ${error.message}`,
                        },
                    ]);
                });
        };

        if ("requestIdleCallback" in window) {
            requestIdleCallback(start);
        } else {
            setTimeout(start, 100);
        }
    }, []);

    // --------------------------------
    // AUTO SCROLL
    // --------------------------------

    useEffect(() => {
        const terminal = terminalRef.current;

        if (!terminal) return;

        terminal.scrollTop = terminal.scrollHeight;
    }, [output]);

    //HELPERS 

    function autoResize(event) {
        const textarea = event.target;

        textarea.style.height = "36px";

        textarea.style.height =
            `${Math.max(textarea.scrollHeight, 36)}px`;
    }


    // --------------------------------
    // ADD OUTPUT
    // --------------------------------

    function addOutput(type, text) {
        setOutput((previous) => [
            ...previous,
            {
                type,
                text,
            },
        ]);
    }

    // --------------------------------
    // HELP
    // --------------------------------
    function showHelp() {
        addOutput(
            "help",
            `SQL PLAYGROUND

SQL
  SELECT
  INSERT
  UPDATE
  DELETE
  CREATE TABLE
  ALTER TABLE
  DROP TABLE
  CREATE INDEX
  DROP INDEX

CLAUSES
  JOIN
  GROUP BY
  ORDER BY
  HAVING
  LIMIT
  DISTINCT
  UNION

TERMINAL
  help;
  clear;
  tables;
  schema;

Example:
  SELECT * FROM scouts;
`
        );
    }

    // --------------------------------
    // SHOW TABLES
    // --------------------------------

    function showTables() {
        try {
            const result = executeSQL(`
                SELECT name AS Tables
                FROM sqlite_master
                WHERE type = 'table'
                ORDER BY name;
            `);

            addOutput(
                "result",
                formatTable(result)
            );
        } catch (error) {
            addOutput(
                "error",
                error.message
            );
        }
    }

    // --------------------------------
    // SHOW SCHEMA
    // --------------------------------

    function showSchema() {
        try {
            const result = executeSQL(`
                SELECT
                    name AS TableName,
                    sql AS Definition
                FROM sqlite_master
                WHERE type = 'table'
                ORDER BY name;
            `);

            addOutput(
                "result",
                formatTable(result)
            );
        } catch (error) {
            addOutput(
                "error",
                error.message
            );
        }
    }

    // --------------------------------
    // SHOW DATABASES
    // --------------------------------

    function showDatabases() {
        addOutput(
            "result",
            `+------------+
| Database   |
+------------+
| playground |
+------------+
1 row in set`
        );
    }

    // --------------------------------
    // EXECUTE SQL
    // --------------------------------

    function executeCommand(sql) {
        const command = sql
            .trim()
            .toLowerCase()
            .replace(/;$/, "")
            .trim();

        // -----------------------------
        // CUSTOM TERMINAL COMMANDS
        // -----------------------------

        if (command === "clear") {
            setOutput([]);
            return;
        }

        if (command === "help") {
            showHelp();
            return;
        }

        if (
            command === "tables" ||
            command === "show tables"
        ) {
            showTables();
            return;
        }

        if (command === "schema") {
            showSchema();
            return;
        }

        if (command === "show databases") {
            showDatabases();
            return;
        }

        // DESC / DESCRIBE

        if (
            command.startsWith("desc ") ||
            command.startsWith("describe ")
        ) {
            try {
                const tableName = command
                    .replace(/^desc\s+/, "")
                    .replace(/^describe\s+/, "")
                    .trim();

                if (!tableName) {
                    addOutput(
                        "error",
                        "ERROR: Table name is required."
                    );

                    return;
                }

                const safeTableName =
                    tableName.replaceAll('"', '""');

                const result = executeSQL(
                    `PRAGMA table_info("${safeTableName}");`
                );

                if (!result || result.length === 0) {
                    addOutput(
                        "error",
                        `ERROR: Table '${tableName}' doesn't exist`
                    );

                    return;
                }

                const formattedResult = result.map((column) => ({
                    Field: column.name,
                    Type: column.type || "TEXT",
                    Null: column.notnull ? "NO" : "YES",
                    Key: column.pk ? "PRI" : "",
                    Default:
                        column.dflt_value === null
                            ? "NULL"
                            : column.dflt_value,
                    Extra: "",
                }));

                addOutput(
                    "result",
                    formatTable(formattedResult)
                );
            } catch (error) {
                addOutput(
                    "error",
                    `ERROR: ${error.message}`
                );
            }

            return;
        }


        // -----------------------------
        // ACTUAL SQL
        // -----------------------------

        try {
            const start = performance.now();

            const result = executeSQL(sql);

            const executionTime = (
                performance.now() - start
            ).toFixed(2);

            // SELECT / PRAGMA etc.
            if (
                Array.isArray(result) &&
                result.length > 0
            ) {
                addOutput(
                    "result",
                    `${formatTable(result)}

${result.length} ${result.length === 1
                        ? "row"
                        : "rows"
                    } returned

Execution time: ${executionTime} ms`
                );

                return;
            }

            // INSERT / UPDATE / DELETE / CREATE etc.
            addOutput(
                "success",
                `Query OK

Execution time: ${executionTime} ms`
            );
        } catch (error) {
            addOutput(
                "error",
                `ERROR: ${error.message}`
            );
        }
    }

    // --------------------------------
    // SUBMIT
    // --------------------------------

    function submitCommand() {
        const sql = input.trim();

        if (!sql || !ready) return;

        // Display command
        addOutput(
            "command",
            sql
        );

        // Add to history
        setHistory((previous) => [
            ...previous,
            sql,
        ]);

        setHistoryIndex(-1);

        // Clear input
        setInput("");

        if (inputRef.current) {
            inputRef.current.style.height = "36px";
        }

        // Execute
        executeCommand(sql);
    }

    // --------------------------------
    // KEYBOARD
    // --------------------------------

    function handleKeyDown(event) {
        // ENTER
        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {
            event.preventDefault();

            submitCommand();

            return;
        }

        // ARROW UP
        if (event.key === "ArrowUp") {
            if (history.length === 0) return;

            event.preventDefault();

            const index =
                historyIndex === -1
                    ? history.length - 1
                    : Math.max(
                        historyIndex - 1,
                        0
                    );

            setHistoryIndex(index);
            setInput(history[index]);

            return;
        }

        // ARROW DOWN
        if (event.key === "ArrowDown") {
            if (history.length === 0) return;

            event.preventDefault();

            if (historyIndex === -1) return;

            const index = historyIndex + 1;

            if (index >= history.length) {
                setHistoryIndex(-1);
                setInput("");

                return;
            }

            setHistoryIndex(index);
            setInput(history[index]);

            return;
        }

        // CTRL + L
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "l"
        ) {
            event.preventDefault();

            setOutput([]);

            return;
        }

        // CTRL + C
        if (
            event.ctrlKey &&
            event.key.toLowerCase() === "c"
        ) {
            event.preventDefault();

            setInput("");

            return;
        }
    }

    // --------------------------------
    // RENDER
    // --------------------------------

    return (
        <div className="h-[100svh] w-screen bg-[#08090B] text-[#E6EDF3] font-mono flex flex-col overflow-hidden">

            {/* HEADER */}

            {/* TERMINAL */}

            <main
                ref={terminalRef}
                onClick={() =>
                    inputRef.current?.focus()
                }


                className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 py-6 pb-20 scrollbar-thin scrollbar-thumb-[#30343b]"
            >

                {/* OUTPUT */}

                {output.map((item, index) => {

                    if (item.type === "command") {
                        return (
                            <div
                                key={index}
                                className="
                mb-5
                min-w-0
                text-[20px] 
                leading-9
            "
                            >
                                <div className="flex items-start gap-2 min-w-0">

                                    <span className="text-[#00E676] font-semibold select-none shrink-0 text-[20px] leading-9">
                                        mysql&gt;
                                    </span>

                                    <pre
                                        className="
                        m-0
                        min-w-0
                        whitespace-pre-wrap
                        break-words
                        font-mono
                        text-[20px] leading-9
                    "
                                        dangerouslySetInnerHTML={{
                                            __html: highlightSQL(item.text)
                                        }}
                                    />

                                </div>
                            </div>
                        );
                    }


                    if (
                        item.type ===
                        "error"
                    ) {
                        return (
                            <pre
                                key={index}
                                className="m-0 mb-5 whitespace-pre-wrap break-words text-[20px] leading-9 text-[#FF5C7A]"
                            >
                                {item.text}
                            </pre>
                        );
                    }

                    if (
                        item.type ===
                        "success"
                    ) {
                        return (
                            <pre
                                key={index}
                                className="m-0 mb-5 whitespace-pre-wrap break-words text-[20px] leading-9 text-[#5EE6A8]"
                            >
                                {item.text}
                            </pre>
                        );
                    }

                    if (item.type === "result") {
                        return (
                            <div
                                key={index}
                                className="mb-5 max-w-full overflow-x-auto scrollbar-thin scrollbar-thumb-[#30343b]"
                            >
                                <pre
                                    className="m-0 w-max min-w-full whitespace-pre text-[20px] leading-9 text-[#E6EDF3]"
                                >
                                    {item.text}
                                </pre>
                            </div>
                        );
                    }




                    if (
                        item.type ===
                        "help"
                    ) {
                        return (
                            <pre
                                key={index}
                                className="m-0 mb-5 whitespace-pre-wrap text-[20px] leading-9 text-gray-400"
                            >
                                {item.text}
                            </pre>
                        );
                    }

                    return (
                        <pre
                            key={index}
                            className="m-0 mb-5 whitespace-pre-wrap text-[20px] leading-9 text-gray-500"
                        >
                            {item.text}
                        </pre>
                    );
                })}

                {/* CURRENT PROMPT */}

                <div className="flex items-start gap-2 text-[20px] leading-9 md:text-sm md:leading-6 min-w-0">

                    <span className="text-[#00E676] font-semibold select-none text-[20px] leading-9">
                        mysql&gt;
                    </span>

                    <div className="relative flex-1 min-w-0">

                        {/* Highlighted SQL */}
                        <pre
                            aria-hidden="true"
                            className="
            absolute
            inset-0
            m-0
            p-0
            whitespace-pre-wrap
            break-words
            pointer-events-none
            font-mono
            text-[20px] leading-9
            overflow-hidden
        "
                            dangerouslySetInnerHTML={{
                                __html: highlightSQL(input) + "\n"
                            }}
                        />

                        {/* Actual input */}
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(event) => {
                                setInput(event.target.value);
                                autoResize(event);
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={!ready}
                            autoFocus
                            spellCheck={false}
                            rows={1}
                            className="
            relative
            w-full
            min-h-9
            resize-none
            overflow-hidden
            bg-transparent
            border-none
            outline-none
            font-mono
            text-[20px] 
            leading-9
            p-0

            text-transparent
            caret-gray-200
        "
                        />

                    </div>

                </div>

            </main>



        </div>
    );
}

export default Terminal;