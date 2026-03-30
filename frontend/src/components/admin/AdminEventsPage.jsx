import React, { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Edit2, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { eventsAPI } from '../../services/api';
import { APP_ROUTES, STORAGE_KEYS } from '../../constants/appConstants';

const Badge = ({ children, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-100 text-emerald-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-800',
  };
  return <span className={[ 'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone] || tones.slate ].join(' ')}>{children}</span>;
};

const statusTone = (status) => {
  switch ((status || '').toLowerCase()) {
    case 'published': return 'green';
    case 'draft': return 'amber';
    case 'pending': return 'blue';
    default: return 'slate';
  }
};

const formatDateTime = (value) => {
  if (!value) return 'Not set';
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const parseEventDate = (value) => {
  if (!value) return null;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTimelineBucket = (event) => {
  // Group events into a human-friendly timeline instead of a flat list.
  const now = new Date();
  const start = parseEventDate(event?.start_time);
  const end = parseEventDate(event?.end_time);

  if (start && now < start) return 'upcoming';
  if (start && end && now >= start && now <= end) return 'ongoing';
  if (end && now > end) return 'past';
  if (start) return now < start ? 'upcoming' : 'past';
  return 'upcoming';
};

const sortUpcoming = (left, right) =>
  (parseEventDate(left.start_time)?.getTime() || Number.POSITIVE_INFINITY) -
  (parseEventDate(right.start_time)?.getTime() || Number.POSITIVE_INFINITY);

const sortOngoing = (left, right) =>
  (parseEventDate(left.end_time)?.getTime() || Number.POSITIVE_INFINITY) -
  (parseEventDate(right.end_time)?.getTime() || Number.POSITIVE_INFINITY);

const sortPast = (left, right) =>
  (parseEventDate(right.end_time)?.getTime() || 0) -
  (parseEventDate(left.end_time)?.getTime() || 0);

const AdminEventsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await eventsAPI.getAllEvents();
        const list = res?.data?.events || [];
        if (active) setEvents(Array.isArray(list) ? list : []);
      } catch (e) {
        if (active) setError(e?.message || 'Failed to load events');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter((evt) => {
      const haystack = [evt.name, evt.subheading, evt.description, evt.timezone, evt.status, ...(evt.roles || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return (!q || haystack.includes(q)) && (status === 'all' || String(evt.status || '').toLowerCase() === status);
    });
  }, [events, query, status]);

  const timelineGroups = useMemo(() => {
    // Sort each bucket independently so upcoming, ongoing, and past events read naturally.
    const grouped = {
      upcoming: [],
      ongoing: [],
      past: [],
    };

    filtered.forEach((evt) => {
      grouped[getTimelineBucket(evt)].push(evt);
    });

    grouped.upcoming.sort(sortUpcoming);
    grouped.ongoing.sort(sortOngoing);
    grouped.past.sort(sortPast);

    return grouped;
  }, [filtered]);

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsAPI.deleteEvent(eventId);
      setEvents((prev) => prev.filter((evt) => evt.id !== eventId));
    } catch (err) {
      alert(`Failed to delete event: ${err.message}`);
    }
  };

  const timelineSections = [
    {
      key: 'upcoming',
      title: 'Upcoming Events',
      description: 'Events that start in the future.',
      tone: 'blue',
      items: timelineGroups.upcoming,
    },
    {
      key: 'ongoing',
      title: 'Ongoing Events',
      description: 'Events happening right now.',
      tone: 'green',
      items: timelineGroups.ongoing,
    },
    {
      key: 'past',
      title: 'Past Events',
      description: 'Events that have already ended.',
      tone: 'slate',
      items: timelineGroups.past,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Event List</h2>
            <p className="mt-1 text-sm text-slate-600">Browse the events created through the conversational admin flow.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isAdmin && (
              <button
                onClick={() => navigate(APP_ROUTES.ADMIN_CHAT)}
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Create In Chat
              </button>
            )}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, status, timezone, or role"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100 sm:w-[360px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-slate-500" />
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 shadow-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100">
                <option value="all">All statuses</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-600">No events found.</div>
        ) : (
          <div className="space-y-6">
            {timelineSections.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{section.title}</h3>
                    <p className="text-sm text-slate-600">{section.description}</p>
                  </div>
                  <Badge tone={section.tone}>{section.items.length} {section.items.length === 1 ? 'event' : 'events'}</Badge>
                </div>

                {section.items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No {section.title.toLowerCase()}.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {section.items.map((evt) => (
                      <article key={evt.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-md">
                        <div className="h-40 bg-slate-100">
                          {evt.banner_url ? (
                            <img src={evt.banner_url} alt={evt.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              <ImageIcon className="h-8 w-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-slate-900">{evt.name}</h3>
                                <Badge tone={statusTone(evt.status)}>{evt.status}</Badge>
                              </div>
                              <p className="mt-1 text-sm font-medium text-slate-600">{evt.subheading || 'No subheading'}</p>
                            </div>
                          </div>

                          <p className="mt-3 line-clamp-3 text-sm text-slate-700">{evt.description || 'No description'}</p>

                          <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Timezone</div>
                              <div className="mt-1 text-slate-900">{evt.timezone}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Language</div>
                              <div className="mt-1 text-slate-900">{evt.language || 'en'}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start</div>
                              <div className="mt-1 text-slate-900">{formatDateTime(evt.start_time)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">End</div>
                              <div className="mt-1 text-slate-900">{formatDateTime(evt.end_time)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Vanish</div>
                              <div className="mt-1 text-slate-900">{formatDateTime(evt.vanish_time)}</div>
                            </div>
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Roles</div>
                              <div className="mt-1 text-slate-900">{evt.roles?.length ? evt.roles.join(', ') : 'Not assigned'}</div>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="mt-4 flex gap-2 border-t border-slate-200 pt-4">
                              <button type="button" onClick={() => navigate(`${APP_ROUTES.ADMIN_CHAT}?eventId=${evt.id}`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                                <Edit2 className="h-4 w-4" />
                                Update In Chat
                              </button>
                              <button type="button" onClick={() => handleDelete(evt.id)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100">
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEventsPage;
