// The only two easing curves on the site — nothing linear.
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(CustomEase);

// entrance: cubic-bezier(0.16, 1, 0.3, 1)
export const EASE_ENTRANCE = CustomEase.create('entrance', 'M0,0 C0.16,1 0.3,1 1,1');
// exit: cubic-bezier(0.7, 0, 0.84, 0)
export const EASE_EXIT = CustomEase.create('exit', 'M0,0 C0.7,0 0.84,0 1,1');
