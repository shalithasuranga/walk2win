import { Component, OnInit, NgZone } from '@angular/core';
import { Params, ActivatedRoute } from '@angular/router';

import { GoogleFitService } from '../../services/google-fit.service';
import { DataService } from 'src/app/services/data.service';
import { CookieService } from 'src/app/services/cookie.service';

@Component({
	selector: 'app-sync',
	templateUrl: './sync.component.html',
	styleUrls: ['./sync.component.less']
})
export class SyncComponent implements OnInit {
	isStepsCounted = false;
	stepCounts = [];
	totals = {
		totalSteps: 0,
		totalPoints: 0
	};
	displayError: string;

	private tempMessage = '';

	public getGmail(): string {
		if (localStorage.getItem('gmail')) {
			return localStorage.getItem('gmail');
		}
		return null;
	}

	constructor(
		private ngZone: NgZone,
		private googleFitService: GoogleFitService,
		private dataService: DataService,
		private cookieService: CookieService,
		private activatedRoute: ActivatedRoute
	) { }

	ngOnInit() {
		// if (this.cookieService.getCookie('access_token') && this.cookieService.getCookie('gmail')) {
		// 	localStorage.setItem('googleoauth', this.cookieService.getCookie('access_token'));
		// 	localStorage.setItem('gmail', decodeURIComponent(this.cookieService.getCookie('gmail')));
		// 	this.getPlayerScore();
		// }

		this.activatedRoute.queryParams.subscribe((params: Params) => {
			if (window.history.state.isManualSync) {
				this.totals.totalPoints = window.history.state.syncResp.totalPoints;
				this.totals.totalSteps = window.history.state.syncResp.totalSteps;
				this.getPlayerScore();
			}
		});

	}

	signIn() {
		// if (!localStorage.getItem('googleoauth')) {
		localStorage.clear();
		this.googleFitService
			.init()
			.then(() => {
				console.log('inited');
			})
			.catch(err => {
				console.log(err);
			});
		// } else {
		// this.getSyncData();
		// }
	}

	getSyncData() {
		const syncDataUrl = `/api/v1/sync`;

		this.dataService.getSyncData(syncDataUrl).subscribe(
			(res: any) => {
				if (res.tokenRefreshed) {
					console.log('token refreshed');
					localStorage.setItem('googleoauth', res.token);
					this.cookieService.createCookie('access_token', res.token, 30);
					this.getSyncData();
				}
				console.log(res);
				if (res.message) {
					this.isStepsCounted = true;
					this.tempMessage = res.message;
				}
			},
			err => {
				console.log(err);
			});
	}

	getPlayerScore() {
		const playerSyncDataUrl = `/api/v1/playersync`;

		this.dataService.getPlayerScore(playerSyncDataUrl).subscribe(
			(res: any) => {
				console.log(res);
				if (res.error) {
					this.displayError = `${res.message}. If you want to join please contact the organizers. `;
					return;
				}
				this.stepCounts = res;
				this.isStepsCounted = true;

			},
			err => {
				console.log(err);
			});
	}

	viewStepCount() {
		const timeGap = {
			endTimeMillis: +new Date(),
			startTimeMillis: 1561401000000
		};
		this.googleFitService.checkCount(timeGap).subscribe(
			resp => {
				console.log(resp);
				const stepCounts = [];
				this.ngZone.run(() => {
					resp.bucket.forEach(element => {
						// 66600000 is the difference between full dates in milliseconds, checking if full date is done else minusing 1
						if (element.dataset[0].point[0]) {
							stepCounts.push({
								date: +element.endTimeMillis % (24 * 60 * 60 * 1000) === 66600000 ? new Date(+element.endTimeMillis - (24 * 60 * 60 * 1000))
									: new Date(+element.endTimeMillis),
								steps: element.dataset[0].point[0].value[0].intVal
							});
						}
					});
					// this.totalStepCount = this.stepCounts.reduce((total, current) =>
					// 	total + current.steps
					// 	, 0);

					this.syncData(stepCounts);
				});
			},
			err => {
				console.log('error view steps');
			}
		);
	}

	public syncData(stepCounts: any) {
		const requestBody = {
			stepCounts
		};
		console.log('requestbody', requestBody);
		const url = '/api/v1/sync';
		this.dataService.syncStepsData(url, requestBody).subscribe((res: any) => {
			console.log('sync ', res);
			this.totals = res;
			this.getPlayerScore();
		}, err => {
			console.log(err);

		});
		// TODO: Call API

	}

}
