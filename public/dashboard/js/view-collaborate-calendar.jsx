// Companions CPAS Collaborate Calendar — live D1 week/day/month CRUD pane.
(function() {
  const h = React.createElement;
  const HOUR_HEIGHT = 48;
  const HOURS = Array.from({ length: 24 }, function(_, i) { return i; });
  const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  function startOfDay(value) {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDays(value, amount) {
    const date = new Date(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function startOfWeek(value) {
    const date = startOfDay(value);
    return addDays(date, -date.getDay());
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function localInput(epoch) {
    const date = new Date(Number(epoch) * 1000);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  }

  function epochFromInput(value) {
    const millis = new Date(value).getTime();
    return Number.isFinite(millis) ? Math.floor(millis / 1000) : null;
  }

  function eventWindow(view, anchor) {
    if (view === 'day') {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1), days: [from] };
    }
    if (view === 'month') {
      const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const from = startOfWeek(first);
      return {
        from,
        to: addDays(from, 42),
        days: Array.from({ length: 42 }, function(_, i) { return addDays(from, i); }),
      };
    }
    const from = startOfWeek(anchor);
    return {
      from,
      to: addDays(from, 7),
      days: Array.from({ length: 7 }, function(_, i) { return addDays(from, i); }),
    };
  }

  function miniMonthDays(anchor) {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const from = startOfWeek(first);
    return Array.from({ length: 42 }, function(_, i) { return addDays(from, i); });
  }

  function formatHour(hour) {
    if (hour === 0) return '12 AM';
    if (hour < 12) return hour + ' AM';
    if (hour === 12) return '12 PM';
    return (hour - 12) + ' PM';
  }

  async function api(url, options) {
    const response = await fetch(url, {
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...(options && options.headers || {}) },
      ...options,
    });
    const data = await response.json().catch(function() { return {}; });
    if (!response.ok || data.ok === false) throw new Error(data.error || 'Calendar request failed');
    return data;
  }

  function defaultDraft(day, hour) {
    const start = new Date(day || new Date());
    start.setHours(hour == null ? Math.min(new Date().getHours() + 1, 22) : hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60000);
    return {
      mode: 'create',
      id: null,
      title: '',
      starts: localInput(Math.floor(start.getTime() / 1000)),
      ends: localInput(Math.floor(end.getTime() / 1000)),
      all_day: false,
      location: '',
      event_type: 'general',
      content: '',
    };
  }

  function draftFromEvent(event) {
    return {
      mode: 'edit',
      id: event.id,
      title: event.title || '',
      starts: localInput(event.starts_at_unix),
      ends: localInput(event.ends_at_unix),
      all_day: !!event.all_day,
      location: event.location || '',
      event_type: event.event_type || 'general',
      content: event.content || '',
    };
  }

  function CalendarEventForm(props) {
    const draft = props.draft;
    function field(name, value) {
      props.setDraft({ ...draft, [name]: value });
    }
    return h('div', {
      className: 'cpas-cal-modal-backdrop',
      role: 'presentation',
      onMouseDown: function(event) {
        if (event.target === event.currentTarget && !props.saving) props.onClose();
      },
    },
      h('section', { className: 'cpas-cal-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'calendar-event-title' },
        h('header', { className: 'cpas-cal-modal-head' },
          h('div', null,
            h('span', null, draft.mode === 'edit' ? 'Edit event' : 'New event'),
            h('h2', { id: 'calendar-event-title' }, draft.mode === 'edit' ? draft.title || 'Calendar event' : 'Create an event')
          ),
          h('button', { type: 'button', disabled: props.saving, onClick: props.onClose, 'aria-label': 'Close event form' }, '×')
        ),
        h('form', { onSubmit: props.onSave },
          h('label', { className: 'cpas-cal-field cpas-cal-field--wide' },
            h('span', null, 'Title'),
            h('input', {
              autoFocus: true,
              required: true,
              value: draft.title,
              onChange: function(event) { field('title', event.target.value); },
              placeholder: 'Add title',
            })
          ),
          h('div', { className: 'cpas-cal-form-grid' },
            h('label', { className: 'cpas-cal-field' },
              h('span', null, 'Starts'),
              h('input', {
                type: 'datetime-local',
                required: true,
                value: draft.starts,
                onChange: function(event) { field('starts', event.target.value); },
              })
            ),
            h('label', { className: 'cpas-cal-field' },
              h('span', null, 'Ends'),
              h('input', {
                type: 'datetime-local',
                required: true,
                value: draft.ends,
                onChange: function(event) { field('ends', event.target.value); },
              })
            ),
            h('label', { className: 'cpas-cal-field' },
              h('span', null, 'Type'),
              h('select', {
                value: draft.event_type,
                onChange: function(event) { field('event_type', event.target.value); },
              },
                ['general', 'volunteer', 'medical', 'adoption', 'fundraising', 'social_post', 'meeting'].map(function(type) {
                  return h('option', { key: type, value: type }, type.replace('_', ' '));
                })
              )
            ),
            h('label', { className: 'cpas-cal-field' },
              h('span', null, 'Location'),
              h('input', {
                value: draft.location,
                onChange: function(event) { field('location', event.target.value); },
                placeholder: 'Optional',
              })
            )
          ),
          h('label', { className: 'cpas-cal-check' },
            h('input', {
              type: 'checkbox',
              checked: draft.all_day,
              onChange: function(event) { field('all_day', event.target.checked); },
            }),
            h('span', null, 'All-day event')
          ),
          h('label', { className: 'cpas-cal-field cpas-cal-field--wide' },
            h('span', null, 'Notes'),
            h('textarea', {
              rows: 4,
              value: draft.content,
              onChange: function(event) { field('content', event.target.value); },
              placeholder: 'Add details for the team',
            })
          ),
          props.formError ? h('p', { className: 'cpas-cal-form-error', role: 'alert' }, props.formError) : null,
          h('footer', { className: 'cpas-cal-modal-actions' },
            draft.mode === 'edit'
              ? h('button', { type: 'button', className: 'is-danger', disabled: props.saving, onClick: props.onDelete }, 'Delete')
              : h('span', null),
            h('div', null,
              h('button', { type: 'button', disabled: props.saving, onClick: props.onClose }, 'Cancel'),
              h('button', { type: 'submit', className: 'is-primary', disabled: props.saving },
                props.saving ? 'Saving…' : draft.mode === 'edit' ? 'Save changes' : 'Create event'
              )
            )
          )
        )
      )
    );
  }

  function MiniMonth(props) {
    const days = miniMonthDays(props.anchor);
    const today = new Date();
    return h('section', { className: 'cpas-cal-mini', 'aria-label': 'Mini month calendar' },
      h('header', null,
        h('button', { type: 'button', onClick: function() { props.shiftMonth(-1); }, 'aria-label': 'Previous month' }, '‹'),
        h('strong', null, props.anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })),
        h('button', { type: 'button', onClick: function() { props.shiftMonth(1); }, 'aria-label': 'Next month' }, '›')
      ),
      h('div', { className: 'cpas-cal-mini-grid' },
        WEEKDAYS.map(function(day) { return h('span', { key: day, className: 'cpas-cal-mini-weekday' }, day.slice(0, 1)); }),
        days.map(function(day) {
          const hasEvent = props.events.some(function(event) {
            return sameDay(new Date(event.starts_at_unix * 1000), day);
          });
          const classes = [
            day.getMonth() !== props.anchor.getMonth() ? 'is-muted' : '',
            sameDay(day, props.anchor) ? 'is-active' : '',
            sameDay(day, today) ? 'is-today' : '',
            hasEvent ? 'has-event' : '',
          ].filter(Boolean).join(' ');
          return h('button', {
            key: day.toISOString(),
            type: 'button',
            className: classes,
            onClick: function() { props.onSelect(day); },
            'aria-label': day.toLocaleDateString(),
          }, day.getDate());
        })
      )
    );
  }

  function EventChip(props) {
    const event = props.event;
    const start = new Date(event.starts_at_unix * 1000);
    const end = new Date(event.ends_at_unix * 1000);
    return h('button', {
      type: 'button',
      className: 'cpas-cal-event is-' + String(event.event_type || 'general').replace(/[^a-z_]/g, ''),
      style: props.style,
      draggable: true,
      onDragStart: function() { props.onDrag(event.id); },
      onClick: function(click) { click.stopPropagation(); props.onEdit(event); },
      title: event.title + ' — ' + start.toLocaleString(),
    },
      h('strong', null, event.title),
      h('span', null, start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
        + ' – ' + end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })),
      event.location ? h('small', null, event.location) : null
    );
  }

  function TimeGrid(props) {
    const now = new Date();
    return h('div', { className: 'cpas-cal-grid-wrap' },
      h('div', {
        className: 'cpas-cal-day-heads',
        style: { '--calendar-days': props.days.length },
      },
        h('div', { className: 'cpas-cal-gutter-head' }),
        props.days.map(function(day) {
          return h('button', {
            key: day.toISOString(),
            type: 'button',
            className: 'cpas-cal-day-head' + (sameDay(day, now) ? ' is-today' : ''),
            onClick: function() { props.onDay(day); },
          },
            h('span', null, WEEKDAYS[day.getDay()]),
            h('strong', null, day.getDate())
          );
        })
      ),
      h('div', {
        className: 'cpas-cal-all-day',
        style: { '--calendar-days': props.days.length },
      },
        h('span', null, 'all-day'),
        props.days.map(function(day) {
          const events = props.events.filter(function(event) {
            return event.all_day && sameDay(new Date(event.starts_at_unix * 1000), day);
          });
          return h('div', { key: day.toISOString() },
            events.map(function(event) {
              return h('button', { key: event.id, type: 'button', onClick: function() { props.onEdit(event); } }, event.title);
            })
          );
        })
      ),
      h('div', { className: 'cpas-cal-scroll' },
        h('div', {
          className: 'cpas-cal-time-grid',
          style: { '--calendar-days': props.days.length, '--hour-height': HOUR_HEIGHT + 'px' },
        },
          h('div', { className: 'cpas-cal-time-axis' },
            HOURS.map(function(hour) {
              return h('span', { key: hour }, formatHour(hour));
            })
          ),
          props.days.map(function(day) {
            const dayStart = startOfDay(day).getTime() / 1000;
            const dayEnd = dayStart + 86400;
            const events = props.events.filter(function(event) {
              return !event.all_day && event.starts_at_unix < dayEnd && event.ends_at_unix > dayStart;
            });
            return h('div', { className: 'cpas-cal-day-column', key: day.toISOString() },
              HOURS.map(function(hour) {
                return h('button', {
                  key: hour,
                  type: 'button',
                  className: 'cpas-cal-hour-slot',
                  onClick: function() { props.onCreate(day, hour); },
                  onDragOver: function(event) { event.preventDefault(); },
                  onDrop: function(event) { event.preventDefault(); props.onDrop(day, hour); },
                  'aria-label': 'Create event ' + day.toLocaleDateString() + ' at ' + formatHour(hour),
                });
              }),
              events.map(function(event) {
                const start = new Date(Math.max(event.starts_at_unix, dayStart) * 1000);
                const endEpoch = Math.min(event.ends_at_unix, dayEnd);
                const minutes = start.getHours() * 60 + start.getMinutes();
                const duration = Math.max(30, (endEpoch - Math.max(event.starts_at_unix, dayStart)) / 60);
                return h(EventChip, {
                  key: event.id,
                  event,
                  style: { top: (minutes / 60 * HOUR_HEIGHT) + 'px', height: Math.max(26, duration / 60 * HOUR_HEIGHT) + 'px' },
                  onEdit: props.onEdit,
                  onDrag: props.onDrag,
                });
              }),
              sameDay(day, now)
                ? h('div', { className: 'cpas-cal-now-line', style: { top: ((now.getHours() * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT) + 'px' } })
                : null
            );
          })
        )
      )
    );
  }

  function MonthGrid(props) {
    const today = new Date();
    return h('div', { className: 'cpas-cal-month-view' },
      h('div', { className: 'cpas-cal-month-weekdays' },
        WEEKDAYS.map(function(day) { return h('span', { key: day }, day); })
      ),
      h('div', { className: 'cpas-cal-month-cells' },
        props.days.map(function(day) {
          const events = props.events.filter(function(event) {
            return sameDay(new Date(event.starts_at_unix * 1000), day);
          });
          return h('button', {
            key: day.toISOString(),
            type: 'button',
            className: [
              day.getMonth() !== props.anchor.getMonth() ? 'is-muted' : '',
              sameDay(day, today) ? 'is-today' : '',
            ].filter(Boolean).join(' '),
            onClick: function() { props.onCreate(day, 9); },
          },
            h('strong', null, day.getDate()),
            h('div', null,
              events.slice(0, 4).map(function(event) {
                return h('span', {
                  key: event.id,
                  onClick: function(click) { click.stopPropagation(); props.onEdit(event); },
                }, event.title);
              }),
              events.length > 4 ? h('small', null, '+' + (events.length - 4) + ' more') : null
            )
          );
        })
      )
    );
  }

  function CollaborateCalendarPane() {
    const [view, setView] = React.useState('week');
    const [anchor, setAnchor] = React.useState(new Date());
    const [events, setEvents] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [draft, setDraft] = React.useState(null);
    const [formError, setFormError] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [dragId, setDragId] = React.useState(null);
    const [upcoming, setUpcoming] = React.useState([]);
    const [upcomingLoading, setUpcomingLoading] = React.useState(true);
    const range = React.useMemo(function() { return eventWindow(view, anchor); }, [view, anchor]);

    const load = React.useCallback(async function() {
      setLoading(true);
      setError('');
      try {
        const from = Math.floor(range.from.getTime() / 1000);
        const to = Math.floor(range.to.getTime() / 1000);
        const data = await api('/api/collaborate/calendar/events?from=' + from + '&to=' + to);
        setEvents(data.events || []);
      } catch (loadError) {
        setError(loadError.message || 'Calendar failed to load');
      } finally {
        setLoading(false);
      }
    }, [range.from.getTime(), range.to.getTime()]);

    React.useEffect(function() { load(); }, [load]);

    const loadUpcoming = React.useCallback(async function() {
      setUpcomingLoading(true);
      try {
        const now = Math.floor(Date.now() / 1000);
        const horizon = now + 60 * 86400;
        const data = await api('/api/collaborate/calendar/events?from=' + now + '&to=' + horizon);
        const sorted = (data.events || [])
          .filter(function(event) { return event.starts_at_unix >= now; })
          .sort(function(a, b) { return a.starts_at_unix - b.starts_at_unix; })
          .slice(0, 6);
        setUpcoming(sorted);
      } catch (upcomingError) {
        setUpcoming([]);
      } finally {
        setUpcomingLoading(false);
      }
    }, []);

    React.useEffect(function() { loadUpcoming(); }, [loadUpcoming]);

    function move(amount) {
      if (view === 'month') {
        setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1));
      } else {
        setAnchor(addDays(anchor, amount * (view === 'week' ? 7 : 1)));
      }
    }

    function selectMini(day) {
      setAnchor(new Date(day));
      if (view === 'month' && day.getMonth() !== anchor.getMonth()) {
        setAnchor(new Date(day.getFullYear(), day.getMonth(), 1));
      }
    }

    function openCreate(day, hour) {
      setFormError('');
      setDraft(defaultDraft(day, hour));
    }

    function openEdit(event) {
      setFormError('');
      setDraft(draftFromEvent(event));
    }

    async function saveEvent(submit) {
      submit.preventDefault();
      setSaving(true);
      setFormError('');
      try {
        const starts = epochFromInput(draft.starts);
        const ends = epochFromInput(draft.ends);
        if (!starts || !ends || ends <= starts) throw new Error('End time must be after start time');
        const payload = {
          title: draft.title,
          starts_at: starts,
          ends_at: ends,
          all_day: draft.all_day,
          location: draft.location,
          event_type: draft.event_type,
          content: draft.content,
        };
        if (draft.mode === 'edit') {
          await api('/api/collaborate/calendar/events/' + encodeURIComponent(draft.id), {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
        } else {
          await api('/api/collaborate/calendar/events', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        }
        setDraft(null);
        await load();
        loadUpcoming();
      } catch (saveError) {
        setFormError(saveError.message || 'Event could not be saved');
      } finally {
        setSaving(false);
      }
    }

    async function deleteEvent() {
      if (!draft || draft.mode !== 'edit') return;
      if (!window.confirm('Delete this event?')) return;
      setSaving(true);
      setFormError('');
      try {
        await api('/api/collaborate/calendar/events/' + encodeURIComponent(draft.id), { method: 'DELETE' });
        setDraft(null);
        await load();
        loadUpcoming();
      } catch (deleteError) {
        setFormError(deleteError.message || 'Event could not be deleted');
      } finally {
        setSaving(false);
      }
    }

    async function dropEvent(day, hour) {
      const event = events.find(function(item) { return item.id === dragId; });
      setDragId(null);
      if (!event) return;
      const start = new Date(day);
      start.setHours(hour, 0, 0, 0);
      const duration = Math.max(1800, event.ends_at_unix - event.starts_at_unix);
      try {
        await api('/api/collaborate/calendar/events/' + encodeURIComponent(event.id), {
          method: 'PATCH',
          body: JSON.stringify({
            starts_at: Math.floor(start.getTime() / 1000),
            ends_at: Math.floor(start.getTime() / 1000) + duration,
          }),
        });
        await load();
      } catch (dropError) {
        setError(dropError.message || 'Event could not be moved');
      }
    }

    const headerTitle = view === 'month'
      ? anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      : view === 'day'
        ? anchor.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : range.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          + ' – ' + addDays(range.to, -1).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return h('div', { className: 'cpas-calendar', 'data-calendar-view': view },
      h('aside', { className: 'cpas-cal-left', 'aria-label': 'Calendar tools' },
        h('button', { type: 'button', className: 'cpas-cal-create', onClick: function() { openCreate(anchor); } },
          h(Icon, { name: 'plus', size: 17 }), h('span', null, 'Create')
        ),
        h(MiniMonth, {
          anchor,
          events,
          onSelect: selectMini,
          shiftMonth: function(amount) { setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + amount, 1)); },
        }),
        h('div', { className: 'cpas-cal-upcoming', 'aria-label': 'Upcoming events' },
          h('header', null,
            h('strong', null, 'Upcoming events'),
            h('button', {
              type: 'button',
              className: 'cpas-cal-upcoming-add',
              onClick: function() { openCreate(new Date()); },
              'aria-label': 'Add upcoming event',
              title: 'Add event',
            }, h(Icon, { name: 'plus', size: 13 }))
          ),
          upcomingLoading
            ? h('p', { className: 'cpas-cal-upcoming-empty' }, 'Loading…')
            : upcoming.length === 0
              ? h('p', { className: 'cpas-cal-upcoming-empty' }, 'No upcoming events in the next 60 days.')
              : h('ul', { className: 'cpas-cal-upcoming-list' },
                  upcoming.map(function(event) {
                    const start = new Date(event.starts_at_unix * 1000);
                    return h('li', { key: event.id },
                      h('button', {
                        type: 'button',
                        onClick: function() { openEdit(event); },
                        className: 'is-' + String(event.event_type || 'general').replace(/[^a-z_]/g, ''),
                      },
                        h('span', { className: 'cpas-cal-upcoming-date' },
                          start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        ),
                        h('span', { className: 'cpas-cal-upcoming-title' }, event.title),
                        !event.all_day
                          ? h('span', { className: 'cpas-cal-upcoming-time' },
                              start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                            )
                          : h('span', { className: 'cpas-cal-upcoming-time' }, 'All day')
                      )
                    );
                  })
                )
        )
      ),
      h('main', { className: 'cpas-cal-main' },
        h('header', { className: 'cpas-cal-toolbar' },
          h('button', { type: 'button', className: 'cpas-cal-mobile-create', onClick: function() { openCreate(anchor); } },
            h(Icon, { name: 'plus', size: 15 }), h('span', null, 'Create')
          ),
          h('button', { type: 'button', className: 'cpas-cal-today', onClick: function() { setAnchor(new Date()); } }, 'Today'),
          h('button', { type: 'button', onClick: function() { move(-1); }, 'aria-label': 'Previous period' }, '‹'),
          h('button', { type: 'button', onClick: function() { move(1); }, 'aria-label': 'Next period' }, '›'),
          h('strong', null, headerTitle),
          h('div', { className: 'cpas-cal-toolbar-actions' },
            h('select', {
              value: view,
              onChange: function(event) { setView(event.target.value); },
              'aria-label': 'Calendar view',
            },
              h('option', { value: 'week' }, 'Week'),
              h('option', { value: 'day' }, 'Day'),
              h('option', { value: 'month' }, 'Month')
            ),
            h('button', { type: 'button', onClick: load, 'aria-label': 'Refresh calendar' }, h(Icon, { name: 'refresh', size: 16 }))
          )
        ),
        error ? h('div', { className: 'cpas-cal-error', role: 'alert' }, h('span', null, error), h('button', { type: 'button', onClick: load }, 'Retry')) : null,
        loading ? h('div', { className: 'cpas-cal-loading', role: 'status' }, 'Loading calendar…') : null,
        !loading && view === 'month'
          ? h(MonthGrid, { days: range.days, anchor, events, onCreate: openCreate, onEdit: openEdit })
          : !loading
            ? h(TimeGrid, {
                days: range.days,
                events,
                onCreate: openCreate,
                onEdit: openEdit,
                onDay: function(day) { setAnchor(day); setView('day'); },
                onDrag: setDragId,
                onDrop: dropEvent,
              })
            : null
      ),
      draft ? h(CalendarEventForm, {
        draft,
        setDraft,
        saving,
        formError,
        onClose: function() { if (!saving) setDraft(null); },
        onSave: saveEvent,
        onDelete: deleteEvent,
      }) : null
    );
  }

  window.CollaborateCalendarPane = CollaborateCalendarPane;
})();
