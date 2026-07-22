import { Component } from '@angular/core';

import { LucideBanknoteX, LucideHandCoins, LucideIndianRupee, LucideTrendingDown, LucideTrendingUp, LucideUser, LucideWallet } from '@lucide/angular';
@Component({
	selector: 'qfin-dashboard',
	imports: [LucideHandCoins, LucideTrendingUp, LucideWallet, LucideTrendingDown, LucideIndianRupee, LucideBanknoteX, LucideUser],
	templateUrl: './dashboard.html'
})
export class Dashboard {

}
