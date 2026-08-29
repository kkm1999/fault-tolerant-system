import { useEffect, useState } from "react";

const API_URL = "http://localhost:5000";

function App() {
  const [analytics, setAnalytics] = useState({
    totalEvents: 0,
    totalAmount: 0,
    byClient: [],
  });

  const [events, setEvents] = useState([]);
  const [failedEvents, setFailedEvents] = useState([]);

  const [jsonInput, setJsonInput] = useState(`{
  "source": "client_A",
  "payload": {
    "metric": "value",
    "amount": "1200",
    "timestamp": "2024/01/01"
  }
}`);

  const [simulateFailure, setSimulateFailure] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(false);

  // Filters
  const [clientFilter, setClientFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // System status
  const [systemOnline, setSystemOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ==================================================
  // FETCH ANALYTICS
  // ==================================================

  const fetchAnalytics = async (
    client = clientFilter,
    from = fromDate,
    to = toDate
  ) => {
    try {
      const params = new URLSearchParams();

      if (client) {
        params.append("client", client);
      }

      if (from) {
        params.append("from", from);
      }

      if (to) {
        params.append("to", to);
      }

      const queryString = params.toString();

      const url = queryString
        ? `${API_URL}/api/analytics?${queryString}`
        : `${API_URL}/api/analytics`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Analytics API unavailable");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Analytics request failed"
        );
      }

      setAnalytics({
        totalEvents: data.totalEvents || 0,
        totalAmount: data.totalAmount || 0,
        byClient: data.byClient || [],
      });

      setSystemOnline(true);

      return data;
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      setSystemOnline(false);
      throw error;
    }
  };

  // ==================================================
  // FETCH EVENTS
  // ==================================================

  const fetchEvents = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`);

      if (!response.ok) {
        throw new Error("Events API unavailable");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(
          data.message || "Events request failed"
        );
      }

      setEvents(data.events || []);
      setFailedEvents(data.failedEvents || []);

      setSystemOnline(true);

      return data;
    } catch (error) {
      console.error("Failed to fetch events:", error);
      setSystemOnline(false);
      throw error;
    }
  };

  // ==================================================
  // INITIAL LOAD
  // ==================================================

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        await Promise.all([
          fetchEvents(),
          fetchAnalytics("", "", ""),
        ]);
      } catch (error) {
        console.error("Initial dashboard load failed:", error);
      }
    };

    loadDashboard();
  }, []);

  // ==================================================
  // APPLY FILTERS
  // ==================================================

  const applyFilters = async () => {
    setMessage("");
    setMessageType("");

    try {
      await fetchAnalytics(
        clientFilter,
        fromDate,
        toDate
      );
    } catch (error) {
      setMessage("Failed to apply analytics filters.");
      setMessageType("error");
    }
  };

  // ==================================================
  // CLEAR FILTERS
  // ==================================================

  const clearFilters = async () => {
    setClientFilter("");
    setFromDate("");
    setToDate("");

    setMessage("");
    setMessageType("");

    try {
      await fetchAnalytics("", "", "");
    } catch (error) {
      setMessage("Failed to clear filters.");
      setMessageType("error");
    }
  };

  // ==================================================
  // REFRESH DATA
  // ==================================================

  const refreshData = async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setMessage("");
    setMessageType("");

    try {
      await fetchEvents();

      await fetchAnalytics(
        clientFilter,
        fromDate,
        toDate
      );

      setSystemOnline(true);

      setMessage("Dashboard refreshed successfully.");
      setMessageType("success");
    } catch (error) {
      console.error("Refresh failed:", error);

      setSystemOnline(false);

      setMessage("Failed to refresh dashboard.");
      setMessageType("error");
    } finally {
      setRefreshing(false);
    }
  };

  // ==================================================
  // PROCESS EVENT
  // ==================================================

  const processEvent = async () => {
    setMessage("");
    setMessageType("");

    let parsedEvent;

    // Parse JSON
    try {
      parsedEvent = JSON.parse(jsonInput);
    } catch (error) {
      setMessage(
        "Invalid JSON. Please check your event format."
      );
      setMessageType("error");
      return;
    }

    // Validate source
    if (!parsedEvent.source) {
      setMessage("Event must contain a source.");
      setMessageType("error");
      return;
    }

    // Validate payload
    if (!parsedEvent.payload) {
      setMessage("Event must contain a payload.");
      setMessageType("error");
      return;
    }

    // Validate metric
    if (!parsedEvent.payload.metric) {
      setMessage("Payload must contain a metric.");
      setMessageType("error");
      return;
    }

    // Validate amount
    if (
      parsedEvent.payload.amount === undefined ||
      parsedEvent.payload.amount === null ||
      parsedEvent.payload.amount === ""
    ) {
      setMessage("Payload must contain an amount.");
      setMessageType("error");
      return;
    }

    setLoading(true);

    try {
      parsedEvent.simulateFailure = simulateFailure;

      const response = await fetch(
        `${API_URL}/api/events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsedEvent),
        }
      );

      const data = await response.json();

      setSystemOnline(true);

      // Simulated / actual failure
      if (!response.ok) {
        setMessage(
          data.message || "Event processing failed."
        );
        setMessageType("error");

        await fetchEvents();

        await fetchAnalytics(
          clientFilter,
          fromDate,
          toDate
        );

        return;
      }

      // Duplicate
      if (data.duplicate) {
        setMessage("Duplicate event ignored.");
        setMessageType("warning");
      } else {
        setMessage("Event processed successfully.");
        setMessageType("success");
      }

      // Refresh current dashboard data
      await fetchEvents();

      await fetchAnalytics(
        clientFilter,
        fromDate,
        toDate
      );
    } catch (error) {
      console.error(
        "Event processing error:",
        error
      );

      setSystemOnline(false);

      setMessage(
        "Could not connect to the backend."
      );
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // CLIENT LIST
  // ==================================================

  const clients = [
    ...new Set(
      events
        .map((event) => event.clientId)
        .filter(Boolean)
    ),
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">

          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Fault-Tolerant Data System
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Reliable event processing & analytics
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="flex items-center gap-2">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  systemOnline
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />

              <span className="text-sm font-medium text-slate-600">
                {systemOnline
                  ? "System Online"
                  : "System Offline"}
              </span>
            </div>

            <button
              onClick={refreshData}
              disabled={refreshing}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh Data"}
            </button>

          </div>

        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">

        {/* ==================================================
            STATISTICS
        ================================================== */}

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Events
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {analytics.totalEvents}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Matching current filters
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Amount
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              ₹{(
                analytics.totalAmount || 0
              ).toLocaleString()}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Aggregated processed value
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Processed
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {analytics.totalEvents}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Successfully stored events
            </p>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Failed Attempts
            </p>

            <p className="mt-2 text-3xl font-bold text-red-600">
              {failedEvents.length}
            </p>

            <p className="mt-2 text-xs text-slate-400">
              Recorded processing failures
            </p>
          </div>

        </section>

        {/* ==================================================
            FILTERS
        ================================================== */}

        <section className="rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Analytics Filters
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Filter processed event analytics by
              client and event date.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Client
              </label>

              <select
                value={clientFilter}
                onChange={(event) =>
                  setClientFilter(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              >
                <option value="">
                  All Clients
                </option>

                {clients.map((client) => (
                  <option
                    key={client}
                    value={client}
                  >
                    {client}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(event) =>
                  setFromDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                onChange={(event) =>
                  setToDate(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
              />
            </div>

          </div>

          <div className="mt-5 flex flex-wrap gap-3">

            <button
              onClick={applyFilters}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Apply Filters
            </button>

            <button
              onClick={clearFilters}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>

          </div>

        </section>

        {/* ==================================================
            SUBMIT EVENT
        ================================================== */}

        <section className="rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Submit Event
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Submit a raw event for normalization,
              fingerprinting and processing.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Raw Event JSON
            </label>

            <textarea
              value={jsonInput}
              onChange={(event) =>
                setJsonInput(event.target.value)
              }
              rows="11"
              spellCheck="false"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 p-4 font-mono text-sm text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {/* Message */}

          {message && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : messageType === "warning"
                  ? "border-yellow-200 bg-yellow-50 text-yellow-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={simulateFailure}
                onChange={(event) =>
                  setSimulateFailure(
                    event.target.checked
                  )
                }
                className="h-4 w-4 rounded border-slate-300"
              />

              <span>
                Simulate Failure
              </span>
            </label>

            <button
              onClick={processEvent}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : "Process Event"}
            </button>

          </div>

        </section>

        {/* ==================================================
            AGGREGATED RESULTS
        ================================================== */}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">

          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Aggregated Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Event totals grouped by client.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    Client
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Events
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Amount
                  </th>
                </tr>
              </thead>

              <tbody>

                {analytics.byClient.map((client) => (
                  <tr
                    key={client.client}
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {client.client}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {client.count}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-700">
                      ₹{(
                        client.totalAmount || 0
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {analytics.byClient.length === 0 && (
                  <tr>
                    <td
                      colSpan="3"
                      className="px-6 py-10 text-center"
                    >
                      <p className="text-sm font-medium text-slate-600">
                        No matching events
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Try changing or clearing the filters.
                      </p>
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* ==================================================
            PROCESSED EVENTS
        ================================================== */}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">

          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Successfully Processed Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Latest events successfully stored in the database.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    ID
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Client
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Metric
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Amount
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody>

                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-slate-600">
                      #{event.id}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {event.clientId}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      {event.metric}
                    </td>

                    <td className="px-6 py-4 text-slate-600">
                      ₹{(
                        event.amount || 0
                      ).toLocaleString()}
                    </td>

                    <td className="px-6 py-4">
                      <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        Processed
                      </span>
                    </td>
                  </tr>
                ))}

                {events.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No processed events yet.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* ==================================================
            FAILED EVENTS
        ================================================== */}

        <section className="overflow-hidden rounded-xl border bg-white shadow-sm">

          <div className="border-b px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              Failed / Rejected Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Events that could not be processed successfully.
            </p>
          </div>

          <div className="overflow-x-auto">

            <table className="w-full text-left text-sm">

              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-6 py-3 font-medium">
                    ID
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Client
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Reason
                  </th>

                  <th className="px-6 py-3 font-medium">
                    Received
                  </th>
                </tr>
              </thead>

              <tbody>

                {failedEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-t transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-4 text-slate-600">
                      #{event.id}
                    </td>

                    <td className="px-6 py-4 font-medium text-slate-900">
                      {event.clientId || "Unknown"}
                    </td>

                    <td className="px-6 py-4 text-red-600">
                      {event.reason}
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {new Date(
                        event.createdAt
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}

                {failedEvents.length === 0 && (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-10 text-center text-slate-500"
                    >
                      No failed events recorded.
                    </td>
                  </tr>
                )}

              </tbody>

            </table>

          </div>

        </section>

        {/* ==================================================
            FOOTER
        ================================================== */}

        <footer className="border-t pt-6 pb-4 text-center">

          <p className="text-sm font-medium text-slate-600">
            Fault-Tolerant Data Processing System
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Reliable event ingestion, duplicate detection,
            failure handling and analytics
          </p>

        </footer>

      </main>
    </div>
  );
}

export default App;