# Synthetic curriculum fixture manifest

This manifest is the canonical specification for the public demonstration's sample curriculum. Stable keys are fixture identities, not a database-schema decision. Full guide copy remains implementation and editorial work.

## Catalog rules

- The catalog has one Course at each A1–C2 Curriculum Level in English (`en`) and Spanish (`es`).
- Each Course, Lesson Unit, objective, guide title, and guide body is authored in its target language. Interface Locale localizes only product chrome, the sample-curriculum notice, badges, and Topic labels.
- Every Lesson Unit has one original `structured_text` guide. English titles use `Lesson guide: <Lesson Unit title>`; Spanish titles use `Guía de la unidad: <Lesson Unit title>`. A guide contains its listed objectives, key language, one short original example or dialogue, and prompts for a teacher-led 60-minute Class Session.
- Four showcase units also have one supplemental `https_reference`. Linked material remains independently licensed by its publisher and is neither copied into nor represented as MIT-licensed project content.
- Public discovery exposes Course and Lesson Unit summaries and objectives, not Lesson Material bodies or outbound reference targets. Every curriculum view carries the localized “Sample curriculum” badge; first restricted-material access repeats the full synthetic, incomplete, and not-formally-certified notice.

## Topics

| Key | English label | Spanish label |
| --- | --- | --- |
| `EC` | Everyday Conversation | Conversación cotidiana |
| `TN` | Travel & Navigation | Viajes y orientación |
| `FC` | Food & Culture | Comida y cultura |
| `WS` | Work & Study | Trabajo y estudios |
| `CS` | Community & Society | Comunidad y sociedad |
| `GS` | Grammar & Structure | Gramática y estructura |
| `PL` | Pronunciation & Listening | Pronunciación y comprensión auditiva |
| `RW` | Reading & Writing | Lectura y escritura |

## Courses and Lesson Units

Every listed unit has the structured guide defined by the catalog rules. The optional Reference column identifies the four additional HTTPS materials.

### `en-a1` — Everyday English Foundations

English A1. Build confidence in short, practical exchanges about identity, places, food, schedules, weather, and messages.

| Unit | State/order | Summary | Objectives | Topics | Reference |
| --- | --- | --- | --- | --- | --- |
| `en-a1-01` — Introductions That Continue | active/1 | Move beyond a name exchange by asking and answering simple follow-up questions. | Introduce yourself with basic personal details. Ask and answer two simple follow-up questions. | EC, PL | — |
| `en-a1-02` — Finding Your Way | active/2 | Use simple landmarks and directions to navigate a familiar town or transport map. | Ask where a place is. Follow and give a short sequence of directions. | TN, EC | [Transport for London maps](https://tfl.gov.uk/maps_/maps) |
| `en-a1-03` — Ordering at a Café | active/3 | Handle a short, courteous café exchange using common food and drink language. | Order a drink and a simple item. Ask about price and respond politely. | FC, EC | — |
| `en-a1-04` — Everyday Schedules | active/4 | Talk about routine times and arrange a simple meeting. | State times and daily routines. Ask for and agree on a meeting time. | WS, GS | — |
| `en-a1-05` — Weather and Simple Plans | active/5 | Describe basic weather and connect it to a near-term plan. | Identify common weather conditions. Make or change a simple plan because of the weather. | EC, PL | [Met Office UK forecast guide](https://weather.metoffice.gov.uk/guides/uk-forecast) |
| `en-a1-06` — Short Messages | active/6 | Read and write brief practical messages about plans and places. | Find the key detail in a short message. Write a clear two- or three-sentence reply. | RW, EC | — |
| `en-a1-00` — First Introductions | retired/legacy | Practice a basic name-and-origin exchange without follow-up conversation. | State your name and where you are from. Recognize the same details in a short dialogue. | EC, PL | — |

### `en-a2` — Everyday Independence

English A2. Handle common arrangements and travel problems with connected, practical language.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `en-a2-01` — Making Appointments | active/1 | Arrange, confirm, and adjust an everyday appointment. | Propose and compare available times. Confirm a change with the essential details. | EC, WS |
| `en-a2-02` — Solving Travel Problems | active/2 | Explain a routine travel problem and ask for a workable next step. | Describe a delay, missed stop, or lost item. Understand and confirm suggested assistance. | TN, PL |

### `en-b1` — Connected Life

English B1. Tell coherent personal stories and contribute clearly to familiar community discussions.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `en-b1-01` — Telling a Work Story | active/1 | Tell a structured story about a workplace or study experience. | Sequence events and explain their outcome. Use follow-up detail to keep a listener oriented. | WS, GS |
| `en-b1-02` — Joining a Community Discussion | active/2 | Express and support a view on a familiar local issue. | State an opinion with relevant reasons. Acknowledge and respond to another viewpoint. | CS, EC |

### `en-b2` — Confident Participation

English B2. Evaluate claims and negotiate practical decisions in sustained group interaction.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `en-b2-01` — Evaluating News and Claims | active/1 | Compare how sources frame a claim and separate evidence from interpretation. | Identify a claim, its support, and missing context. Explain why two accounts emphasize different details. | RW, CS |
| `en-b2-02` — Negotiating a Group Decision | active/2 | Move a group from competing preferences to a qualified agreement. | Frame priorities and tradeoffs precisely. Propose and refine a compromise. | EC, WS |

### `en-c1` — Nuanced Communication

English C1. Interpret implication and present complex ideas with deliberate structure and stance.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `en-c1-01` — Reading Between the Lines | active/1 | Interpret stance, implication, and rhetorical distance in demanding texts. | Infer an unstated position from linguistic cues. Compare literal meaning with pragmatic effect. | RW, GS |
| `en-c1-02` — Presenting a Complex Proposal | active/2 | Build and defend a layered proposal for a professional or civic audience. | Organize evidence around a clear line of reasoning. Handle challenges without losing nuance or scope. | WS, CS |

### `en-c2` — Precise and Persuasive English

English C2. Exercise fine control of register, implication, and synthesis across demanding contexts.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `en-c2-01` — Calibrating Tone and Register | active/1 | Adapt the same substantive message across sensitive social and professional contexts. | Control formality, directness, and interpersonal distance. Explain the pragmatic effect of small wording changes. | GS, EC |
| `en-c2-02` — Synthesizing Competing Perspectives | active/2 | Produce a fair, incisive synthesis from complex and partially conflicting accounts. | Integrate agreement, tension, and uncertainty without flattening them. Develop an original conclusion proportionate to the evidence. | RW, CS |

### `es-a1` — Español para el día a día

Spanish A1. Desarrolla seguridad en intercambios breves sobre identidad, lugares, comida, horarios, tiempo y mensajes.

| Unit | State/order | Summary | Objectives | Topics | Reference |
| --- | --- | --- | --- | --- | --- |
| `es-a1-01` — Presentarse y seguir conversando | active/1 | Amplía una presentación básica con preguntas y respuestas sencillas. | Presentarse con datos personales básicos. Hacer y responder dos preguntas sencillas para continuar. | EC, PL | — |
| `es-a1-02` — Preguntar cómo llegar | active/2 | Usa lugares de referencia e indicaciones sencillas para orientarse. | Preguntar dónde está un lugar. Seguir y dar una secuencia breve de indicaciones. | TN, EC | — |
| `es-a1-03` — Pedir en una cafetería | active/3 | Participa con cortesía en un intercambio breve sobre comida y bebida. | Pedir una bebida y un alimento sencillo. Preguntar el precio y responder con cortesía. | FC, EC | [Gastronomía y enoturismo — Spain.info](https://www.spain.info/es/gastronomia-enoturismo/) |
| `es-a1-04` — Horarios y citas | active/4 | Habla de horas habituales y acuerda una cita sencilla. | Decir la hora y describir una rutina. Preguntar y acordar una hora de encuentro. | WS, GS | [Actividades del AVE: pedir y dar la hora](https://cvc.cervantes.es/ensenanza/actividades_ave/niveli/ficha_02.htm) |
| `es-a1-05` — El tiempo y los planes | active/5 | Describe el tiempo básico y lo relaciona con un plan próximo. | Identificar condiciones meteorológicas frecuentes. Proponer o cambiar un plan por el tiempo. | EC, PL | — |
| `es-a1-06` — Mensajes breves | active/6 | Lee y escribe mensajes prácticos y breves sobre planes y lugares. | Localizar el dato principal de un mensaje corto. Escribir una respuesta clara de dos o tres frases. | RW, EC | — |

### `es-a2` — Autonomía cotidiana

Spanish A2. Resuelve citas y problemas de viaje habituales con lenguaje práctico y conectado.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `es-a2-01` — Organizar una cita | active/1 | Propone, confirma y modifica una cita cotidiana. | Proponer y comparar horas disponibles. Confirmar un cambio con los datos esenciales. | EC, WS |
| `es-a2-02` — Resolver problemas de viaje | active/2 | Explica un problema de viaje habitual y pide una solución posible. | Describir un retraso, una parada perdida o un objeto extraviado. Comprender y confirmar la ayuda propuesta. | TN, PL |

### `es-b1` — Vida y conexiones

Spanish B1. Relata experiencias coherentes y participa con claridad en conversaciones comunitarias.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `es-b1-01` — Contar una experiencia laboral | active/1 | Relata de forma estructurada una experiencia de trabajo o estudio. | Ordenar los hechos y explicar el resultado. Añadir detalles que orienten a quien escucha. | WS, GS |
| `es-b1-02` — Participar en una conversación comunitaria | active/2 | Expresa y fundamenta una postura sobre un asunto local conocido. | Presentar una opinión con razones pertinentes. Reconocer y responder a otro punto de vista. | CS, EC |

### `es-b2` — Participación con confianza

Spanish B2. Evalúa afirmaciones y negocia decisiones prácticas en interacciones de grupo sostenidas.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `es-b2-01` — Evaluar noticias y argumentos | active/1 | Compara el enfoque de varias fuentes y distingue pruebas de interpretaciones. | Identificar una afirmación, su apoyo y el contexto que falta. Explicar por qué dos versiones destacan datos distintos. | RW, CS |
| `es-b2-02` — Negociar una decisión de grupo | active/2 | Conduce al grupo desde preferencias distintas hasta un acuerdo matizado. | Formular prioridades y concesiones con precisión. Proponer y ajustar una solución de compromiso. | EC, WS |

### `es-c1` — Comunicación con matices

Spanish C1. Interpreta implicaciones y presenta ideas complejas con estructura y postura deliberadas.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `es-c1-01` — Leer entre líneas | active/1 | Interpreta postura, implicación y distancia retórica en textos exigentes. | Inferir una postura no explícita a partir de indicios lingüísticos. Comparar el sentido literal con el efecto pragmático. | RW, GS |
| `es-c1-02` — Presentar una propuesta compleja | active/2 | Construye y defiende una propuesta con varias capas ante un público profesional o cívico. | Organizar las pruebas en torno a un razonamiento claro. Responder a objeciones sin perder matices ni alcance. | WS, CS |

### `es-c2` — Precisión y persuasión

Spanish C2. Controla con precisión el registro, la implicación y la síntesis en contextos exigentes.

| Unit | State/order | Summary | Objectives | Topics |
| --- | --- | --- | --- | --- |
| `es-c2-01` — Ajustar tono y registro | active/1 | Adapta el mismo contenido a contextos sociales y profesionales delicados. | Controlar la formalidad, la franqueza y la distancia interpersonal. Explicar el efecto pragmático de pequeños cambios de formulación. | GS, EC |
| `es-c2-02` — Sintetizar perspectivas contrapuestas | active/2 | Elabora una síntesis justa e incisiva de versiones complejas y parcialmente contradictorias. | Integrar acuerdos, tensiones e incertidumbre sin simplificarlos. Desarrollar una conclusión propia proporcionada a las pruebas. | RW, CS |

## Lifecycle and demonstration states

- `en-a1-00` remains retired with its guide and historical identity, has no future Class Session, and is excluded from the active English A1 denominator. Its directional replacement is `en-a1-01`; replacement does not transfer completion.
- The shared Student has an Attended historical Booking and Completion for `en-a1-00`, retains its guide access, and has no completion for `en-a1-01`.
- The shared Student's Course Progress is English A1 `3/6` active (`en-a1-02`, `en-a1-03`, `en-a1-06`), English A2 `2/2`, Spanish A1 `2/6` (`es-a1-01`, `es-a1-04`), and Spanish B1 `0/2`. The retired English A1 completion contributes zero to current progress.
- The Sponsorship captures English A1 at `1/6` on acceptance, attributes two active completions during Sponsorship, and freezes `3/6` at its end. The Organization Manager sees the baseline, gain, and ending counts but not the pre-Sponsorship unit identity.
- The shared Student has an active Booking for a future `en-a1-05` session and can access both materials. A second Student has a Student Cancellation without Completion for `es-a1-03` and cannot access its materials.
- A synthetic Student's sole Attended record for `en-a1-05` is corrected to No-show; its Completion and material access are removed.
- The shared Teacher is assigned to the future `en-a1-05` session and can access its materials. A qualified but unassigned Teacher receives Not Found. Qualification alone never grants access.
- Platform Administrators manage every material. Organization Managers receive no Lesson Material access through reporting or Sponsorship. Anonymous and merely discovering Students see summaries and objectives only.

## Validation invariants

- Exactly 12 Courses: 2 target languages × 6 Curriculum Levels.
- Exactly 33 Lesson Units: 32 active and 1 retired. English A1 has 6 active plus 1 retired; Spanish A1 has 6 active; each other Course has 2 active.
- Exactly 37 Lesson Materials: 33 structured guides plus 4 HTTPS references. Exactly two English A1 and two Spanish A1 units have a second material.
- Exactly 8 Topics; each is used, every unit has one or two, and multi-Topic units exercise match-any discovery.
- All `en-*` original content is English and all `es-*` original content is Spanish. External references retain publisher language and provenance.
- No fixture claims mastery, certification, Course enrollment, Interface Locale translation of authored content, public Lesson Material access, or ownership/licensing of linked content.
