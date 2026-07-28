# Isolate live meetings behind a classroom provider

The booking domain obtains Classroom Access through a replaceable provider interface and does not model a particular video vendor. The portfolio deployment uses an internal simulated classroom rather than real video: it identifies the session, teacher, lesson, and simulation status without media transport. The API checks access on every entry and never exposes a destination through public discovery. This keeps the live-session journey coherent while leaving Zoom, Whereby, or another provider as a later adapter.
