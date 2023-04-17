<script lang="ts">
	import Logo from "../assets/github-mark.svg";

	export let href: string = "";
	export let width: number = 25;
</script>

<a {href} target="_blank">
	<img src={Logo} alt="github logo" {width} />
</a>

<style>
	/*  put stuff here */
</style>
