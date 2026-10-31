import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'vc-shell',
  styleUrl: './shell.css',
  templateUrl: './shell.html',
})
export class Shell {}
