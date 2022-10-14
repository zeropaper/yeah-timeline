interface Plotter {
  (seconds: number): number[];
}

function initStyleSheet(sheet: CSSStyleSheet) {
  sheet.insertRule(`.container, .container *, .container *::before, .container *::after {
    box-sizing: border-box;
  }`);

  sheet.insertRule(`.timeline-container {
    position: relative;
    overflow-y: scroll;
  }`);

  sheet.insertRule(`.timeline {
    border: 1px solid;
    position: relative;
    min-height: 200px;
    min-width: calc(var(--tl-sec-width) * var(--tl-content-length));
    background-repeat: repeat;
    background-size: var(--tl-sec-width);
    background-image: linear-gradient(90deg, transparent, 0%, transparent calc(var(--tl-sec-width) - 1px), var(--border-color, currentColor) var(--tl-sec-width));
  }`);

  sheet.insertRule(`.duration-overlay {
    position: absolute;
    height: 100%;
    width: calc(var(--tl-sec-width) * var(--tl-content-length));
    background-color: var(--duration-color, #00000033);
  }`);

  sheet.insertRule(`.timeline-container canvas {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    display: block;
  }`);

  sheet.insertRule(`.controls {
    display: flex;
    gap: 10px;
  }`);

  sheet.insertRule(`.zoom-range {
    flex-grow: 1;
  }`);

  sheet.insertRule(`.event-container {
    position: relative;
    width: 100%;
  }`);

  sheet.insertRule(`.event {
    position: relative;
    left: calc(var(--tl-sec-width) * var(--tl-event-position));
    width: calc(var(--tl-sec-width) * var(--tl-event-duration));
    background: var(--background-color, white);
    border: 1px solid var(--border-color, currentColor);
    overflow: visible;
    border-radius: var(--spacing, 3px);
    padding: var(--spacing, 3px) calc(2 * var(--spacing, 3px));
  }`);

  sheet.insertRule(`.event.point {
    border: none;
    display: inline-block;
    width: auto;
    position: relative;
    translate: 6px 0;
  }`);
  sheet.insertRule(`.event.point::before {
    content: "";
    border: 1px solid currentColor;
    border-radius: 5px;
    width: 5px;
    height: 5px;
    position: absolute;
    top: calc(50% - 3px);
    left: -9px;
  }`);
}

export class PlotData extends Array<number[]> {
  #interval: number = 0.001; // 1ms

  set interval(value: string | number) {
    this.#interval = Number(value);
  }

  set duration(value: string | number) {
    const val = Number(value);
    this.interval = this.length / val;
  }

  get interval() {
    return this.#interval;
  }

  get duration() {
    return this.#interval * this.length;
  }

  static from(value: any) {
    const instance = new PlotData();
    Array.from<number[]>(value).forEach((v) => instance.push(v));
    return instance;
  }
}

export default class Timeline extends HTMLElement {
  static get observedAttributes() {
    return ['duration', 'pxPerSec', 'position'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const container = document.createElement('div');
    container.classList.add('container');
    const style = document.createElement('style');

    this.shadowRoot.append(style, container);

    const timeline = document.createElement('div');
    timeline.classList.add('timeline');

    const durationOverlay = document.createElement('div');
    durationOverlay.classList.add('duration-overlay');

    const canvas = document.createElement('canvas');

    const timelineContainer = document.createElement('div');
    timelineContainer.classList.add('timeline-container');
    timeline.appendChild(canvas);
    timeline.appendChild(durationOverlay);
    timelineContainer.appendChild(timeline);

    container.appendChild(timelineContainer);

    const displayTime = document.createElement('span');
    const displayZoom = document.createElement('span');

    const zoomSlider = document.createElement('input');
    zoomSlider.classList.add('zoom-range');
    zoomSlider.type = 'range';
    zoomSlider.value = '' + this.#zoom;
    zoomSlider.max = '' + 3;
    zoomSlider.min = '' + 0.1;
    zoomSlider.step = '' + 0.1;

    const controls = document.createElement('div');
    controls.classList.add('controls');
    controls.appendChild(displayZoom);
    controls.appendChild(zoomSlider);
    controls.appendChild(displayTime);

    container.appendChild(controls);

    this.#els = {
      canvas,
      style,
      zoomSlider,
      container,
      displayTime,
      displayZoom,
      timeline,
    };
  }

  connectedCallback() {
    const { zoomSlider, style } = this.#els;

    initStyleSheet(style.sheet);

    this.#populateChildren();

    this.#updateDOM();

    zoomSlider.addEventListener('change', () => {
      const { zoomSlider } = this.#els;
      this.zoom = zoomSlider.value;
      this.#updateDOM();
    });
  }

  #els: {
    canvas: HTMLCanvasElement;
    style: HTMLStyleElement;
    zoomSlider: HTMLInputElement;
    container: HTMLElement;
    displayTime: HTMLElement;
    displayZoom: HTMLElement;
    timeline: HTMLElement;
  };

  #data: {
    [k: string]: PlotData;
  } = {};

  setData(key: string, data: PlotData) {
    this.#data[key] = data;
    this.#draw();
    return this;
  }

  #zoom: number = 1;

  get zoom(): number {
    return this.#zoom;
  }

  set zoom(value: number | string) {
    const { zoomSlider } = this.#els;
    this.#zoom = Number(value);
    zoomSlider.value = '' + value;
  }

  #duration: number = 2.5;

  get duration() {
    return this.#duration;
  }

  #pxPerSec: number = 50;

  get pxPerSec() {
    return this.#pxPerSec;
  }

  get visibleRange(): [number, number] {
    const { container } = this.#els;
    const width = container.clientWidth;
    return [0, width / (this.pxPerSec * this.#zoom)];
  }

  #updateDOM() {
    const { zoomSlider, container, displayTime, displayZoom } = this.#els;
    const zoom = this.#zoom;
    const duration = this.#duration;
    const width = container.clientWidth;
    zoomSlider.value = '' + zoom;
    displayTime.textContent = (width / (this.pxPerSec * zoom)).toFixed(2);
    displayZoom.textContent = zoom.toFixed(1);
    container.setAttribute(
      'style',
      `--tl-sec-width: ${50 * zoom}px; --tl-content-length: ${duration}`
    );
    this.#resizeCanvas();
  }

  #resizeCanvas() {
    const { timeline, canvas } = this.#els;
    canvas.width = timeline.clientWidth;
    canvas.height = timeline.clientHeight;

    this.#draw();
  }

  #draw() {
    const { canvas } = this.#els;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'lime';
    ctx.fillStyle = 'pink';

    Object.entries<PlotData>(this.#data).forEach(([name, matrix]) => {
      console.info('matrix', name, matrix);
    });

    // const fn = (v: number) => v % (this.pxPerSec * this.zoom);

    // ctx.beginPath();
    // ctx.moveTo(0, canvas.height * 0.5);
    // for (let x = 0; x <= canvas.width; x += 1) {
    //   const y = fn(x) + canvas.height * 0.5;
    //   if (x === 0) {
    //     ctx.lineTo(x, y);
    //   } else if (x === canvas.width) {
    //     ctx.lineTo(x, y);
    //   } else {
    //     ctx.lineTo(x, y);
    //   }
    // }
    // ctx.lineTo(canvas.width, canvas.height);
    // ctx.lineTo(0, canvas.height);
    // ctx.closePath();

    // ctx.stroke();
    // ctx.fill();
  }

  addEvent(
    position: number,
    label: string | Element,
    duration?: number,
    interval: number = 0
  ) {
    console.info('interval', interval);
    if (interval) {
      const minDuration = this.duration;
      for (let i = position; i <= minDuration; i += interval) {
        this.addEvent(i, label, duration);
      }
      return;
    }
    const { timeline } = this.#els;
    const eventNode =
      typeof label === 'string'
        ? document.createElement('div')
        : (label.cloneNode(true) as HTMLElement);
    eventNode.classList.add('event');
    eventNode.setAttribute(
      'style',
      `--tl-event-position: ${position}; --tl-event-duration: ${duration || 0}`
    );
    if (!duration) eventNode.classList.add('point');
    if (typeof label === 'string') eventNode.textContent = label;

    const nodeContainer = document.createElement('div');
    nodeContainer.classList.add('event-container');
    nodeContainer.appendChild(eventNode);
    timeline.appendChild(nodeContainer);
  }

  appendChild<T extends Node>(node: T): T {
    // super.appendChild(node);
    if (!(node instanceof Element))
      throw new Error('Node is not an Element instance');

    const position = Number(node.getAttribute('data-position') || 0);
    const duration = Number(node.getAttribute('data-duration') || 0);
    const interval = Number(node.getAttribute('data-interval') || 0);
    this.addEvent(position, node, duration, interval);

    return node;
  }

  #populateChildren() {
    this.querySelectorAll('[data-position]').forEach((child) =>
      this.appendChild(child)
    );
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'duration') {
      this.#duration = Number(newValue);
    } else if (name === 'pxPerSec') {
      this.#pxPerSec = Number(newValue);
    }
  }
}
