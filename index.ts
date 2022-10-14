import { PlotData } from './yeah-timeline';
import Timeline from './yeah-timeline';

// @ts-ignore
const app: HTMLDivElement = window.app;

customElements.define('yeah-timeline', Timeline);

const componentInstance = <Timeline>document.createElement('yeah-timeline');
// componentInstance.setAttribute('duration', '23.5');

app.appendChild(componentInstance);

componentInstance.addEvent(3.2, 'first');
componentInstance.addEvent(
  4.8,
  (function () {
    const el = document.createElement('span');
    el.textContent = 'Second';
    return el;
  })(),
  2.2
);
componentInstance.addEvent(6, 'third', 3);

const childA = document.createElement('div');
childA.setAttribute('data-position', '7');
childA.textContent = 'Yo!!!';
componentInstance.appendChild(childA);

const plotData = PlotData.from([
  [1, 1, 1, 1, 1],
  [2, 2, 2, 2, 2],
  [3, 3, 3, 3, 3],
  [4, 4, 4, 4, 4],
]);

