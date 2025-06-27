#!/usr/bin/env python3

import os,random
def main():
	candidates = []
	for root,_,files in os.walk('cctop/test'):
		for f in files:
			candidates.append(f'{root}/{f}')
	random.shuffle(candidates)

	K = 1
	for _ in range(K):
		print(candidates[0])
#		os.remove(candidates[0])

if __name__ == '__main__':
	main()