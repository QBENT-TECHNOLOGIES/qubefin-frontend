import { Component, ElementRef, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { LucideDynamicIcon } from '@lucide/angular';

import { AlertService } from 'qubefin-core';

/**
 * The three actions every candidate letter shares - View & Print, Send, Mark Received - as one split
 * button: Send is the primary action, the other two live behind the caret.
 *
 * The parent keeps the handlers and decides whether the control is rendered at all (the show* flags from
 * USP_GetInterviewCandidateById). This component owns only its menu state and the confirmation step:
 * both Send and Mark Received ask before they fire, and the outputs are emitted only on confirm - so
 * every letter gets the same guard without four copies of the prompt.
 */
@Component({
  selector: 'qfin-letter-actions',
  imports: [LucideDynamicIcon],
  templateUrl: './letter-actions.html',
  styles: ``,
})
export class LetterActions {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly alertService = inject(AlertService);

  /** The letter's name as it reads on the button, without the word "Letter": Interview, Offer,
   * Appointment, Welcome. */
  readonly letterName = input.required<string>();

  /** A send is in flight - the primary button shows "Sending..." and locks. */
  readonly sending = input(false);

  /** A receive is in flight - the menu item shows "Receiving..." and locks. */
  readonly receiving = input(false);

  readonly view = output<void>();
  readonly send = output<void>();
  readonly receive = output<void>();

  readonly menuOpen = signal(false);

  readonly busy = computed(() => this.sending() || this.receiving());

  readonly sendLabel = computed(() =>
    this.sending() ? 'Sending...' : `Send ${this.letterName()} Letter`,
  );

  readonly receiveLabel = computed(() => (this.receiving() ? 'Receiving...' : 'Mark Received'));

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  onView() {
    this.menuOpen.set(false);
    this.view.emit();
  }

  /** Sending mails the candidate, so ask first. */
  async onSend() {
    this.menuOpen.set(false);

    const letter = `${this.letterName()} Letter`;
    const result = await this.alertService.confirm(
      `Send ${letter}?`,
      `The ${letter.toLowerCase()} will be emailed to the candidate.`,
      'Yes, send',
      'Cancel',
    );

    if (result.isConfirmed) {
      this.send.emit();
    }
  }

  /** Marking a letter received advances the candidate to the next step of the document chain and there
   * is no "un-receive" action, so this one is confirmed too - and says as much. */
  async onReceive() {
    this.menuOpen.set(false);

    const letter = `${this.letterName()} Letter`;
    const result = await this.alertService.confirm(
      `Mark ${letter} as received?`,
      `This records that the candidate has received the ${letter.toLowerCase()} and opens the next step. It cannot be undone from here.`,
      'Yes, mark received',
      'Cancel',
    );

    if (result.isConfirmed) {
      this.receive.emit();
    }
  }

  /** Clicking anywhere outside this control closes the menu. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menuOpen()) {
      return;
    }

    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.menuOpen.set(false);
  }
}
